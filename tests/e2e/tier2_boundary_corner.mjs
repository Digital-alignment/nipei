/**
 * Tier 2: Boundary & Corner Cases E2E Tests
 * Covers edge conditions, extreme values, encoding fidelity, and corrupt inputs:
 * 1. Empty tasks collection & boundaries (2 tests)
 * 2. Corrupt/missing YAML frontmatter (2 tests)
 * 3. Mandatory schema omission degradation (1 test)
 * 4. Radical status jumping & edge status transitions (1 test)
 * 5. Special characters, accents & Unicode emoji fidelity (1 test)
 * 6. Windows backslash vs Unix slash path normalization (1 test)
 * 7. Extreme markdown body stress & preservation (1 test)
 */

import path from "node:path";
import fs from "node:fs";
import { describe, test, expect, beforeEach, afterEach } from "./harness.mjs";
import { createTempVault, createTempStateDir } from "./fixtures.mjs";
import { createTaskStore, createVaultEngine } from "./engine.mjs";
import { validateVaultNoteContent } from "./validator.mjs";

export function registerTier2Tests() {
  describe("Tier 2: Boundary, Corner Cases & Adversarial Verification", () => {
    let vaultDir, cleanupVault, engine;
    let stateDir, cleanupState, store;

    beforeEach(async () => {
      const vault = await createTempVault();
      vaultDir = vault.vaultDir;
      cleanupVault = vault.cleanup;
      engine = createVaultEngine(vaultDir);

      const state = await createTempStateDir();
      stateDir = state.stateDir;
      cleanupState = state.cleanup;
      store = createTaskStore(stateDir);
    });

    afterEach(async () => {
      await cleanupVault();
      await cleanupState();
    });

    test("2.1 Empty tasks collection handles listing, filtering, and sorting without error", async () => {
      const list = await store.listTasks();
      expect(list).toEqual([]);

      const filtered = await store.listTasks({ status: "backlog", assignedAgent: "claude" });
      expect(filtered).toEqual([]);

      const sorted = await store.listTasks({ sortBy: "priority" });
      expect(sorted).toEqual([]);
    });

    test("2.2 Boundary task attributes: empty description, empty tags, single-char title, long title (500 chars)", async () => {
      const singleChar = await store.createTask({
        title: "A",
        description: "",
        tags: [],
      });
      expect(singleChar.title).toBe("A");
      expect(singleChar.description).toBe("");
      expect(singleChar.tags).toEqual([]);

      const longTitle = "Z".repeat(500);
      const largeTask = await store.createTask({
        title: longTitle,
      });
      expect(largeTask.title.length).toBe(500);

      // Empty string title must throw
      let threw = false;
      try {
        await store.createTask({ title: "   " });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });

    test("2.3 Malformed YAML frontmatter syntax handled gracefully without crashing", async () => {
      const malformedContent = `---
id: broken-yaml
nombre: Broken: [Unclosed bracket
tipo: cliente_externo
---
# Body of broken file
`;
      const notePath = path.join(vaultDir, "Clientes", "Broken.md");
      await fs.promises.writeFile(notePath, malformedContent, "utf8");

      const read = await engine.readVaultNote("Clientes/Broken.md");
      expect(read).toBeNull();

      const validation = validateVaultNoteContent(malformedContent, "Broken.md");
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain("YAML parse error");
    });

    test("2.4 Missing frontmatter entirely (pure markdown file) detected and discarded from brand listing", async () => {
      const pureMarkdown = `# Pure Documentation Note
This file does not have any YAML frontmatter at all.
It is a simple reference document.
`;
      const notePath = path.join(vaultDir, "Clientes", "DocNote.md");
      await fs.promises.writeFile(notePath, pureMarkdown, "utf8");

      const read = await engine.readVaultNote("Clientes/DocNote.md");
      expect(read).toBeNull();

      const clients = await engine.parseAllClients();
      const ids = clients.map((c) => c.id);
      expect(ids).not.toContain("docnote");
    });

    test("2.5 Missing mandatory root keys (id missing or nombre missing) discarded per da-vault-schema", async () => {
      const missingId = `---
nombre: Name Without ID
tipo: cliente_externo
---
# Note
`;
      const validationMissingId = validateVaultNoteContent(missingId, "no-id.md");
      expect(validationMissingId.valid).toBe(false);
      expect(validationMissingId.errors.some((e) => e.includes("Missing mandatory root key 'id'"))).toBe(true);

      const missingNombre = `---
id: brand-without-name
tipo: cliente_externo
---
# Note
`;
      const validationMissingNombre = validateVaultNoteContent(missingNombre, "no-nombre.md");
      expect(validationMissingNombre.valid).toBe(false);
      expect(validationMissingNombre.errors.some((e) => e.includes("Missing mandatory root key 'nombre'"))).toBe(true);
    });

    test("2.6 Direct edge status jumps: task moves directly from backlog to done, then reopened to in_progress", async () => {
      const task = await store.createTask({ title: "Edge Status Jump Task", status: "backlog" });
      expect(task.status).toBe("backlog");

      // Jump directly from backlog to done
      const completed = await store.moveTaskStatus(task.id, "done");
      expect(completed.status).toBe("done");

      // Reopen directly to in_progress
      const reopened = await store.moveTaskStatus(task.id, "in_progress");
      expect(reopened.status).toBe("in_progress");

      // Move back to backlog
      const backlogged = await store.moveTaskStatus(task.id, "backlog");
      expect(backlogged.status).toBe("backlog");
    });

    test("2.7 Special characters & Unicode integrity: Portuguese/Indigenous accents, emojis, quotes", async () => {
      const complexTitle = `Nipëi OS 🪶 — Integração de "Cantos Yawanawá", Açúcar & Rapé (Serra Grande / BA)`;
      const task = await store.createTask({
        title: complexTitle,
        description: "Caracteres especiais: ç, ã, õ, ê, î, ë, ü, 🪶, 🏛️, 🌿, ⚡, «aspas francesas»",
        tags: ["sananga-pura", "língua-indígena", "pajé"],
      });

      expect(task.title).toBe(complexTitle);
      expect(task.description).toContain("ç, ã, õ, ê, î, ë, ü");
      expect(task.description).toContain("🪶, 🏛️, 🌿");

      // Verify writing to vault preserves all unicode symbols
      await engine.writeVaultNote("Clientes/unicode-test.md", {
        id: "unicode-test",
        nombre: "Nipëi & Inî Rau 🌿",
        categoria: "Santuário Espiritual Yawanawá",
        emoji: "🪶",
      });

      const read = await engine.readVaultNote("Clientes/unicode-test.md");
      expect(read.nombre).toBe("Nipëi & Inî Rau 🌿");
      expect(read.categoria).toBe("Santuário Espiritual Yawanawá");
      expect(read.emoji).toBe("🪶");
    });

    test("2.8 Path normalization: relative path with Windows backslashes resolves identically to forward slashes", async () => {
      const readUnix = await engine.readVaultNote("Clientes/Nipeihu.md");
      const readWindows = await engine.readVaultNote("Clientes\\Nipeihu.md");

      expect(readUnix).toBeDefined();
      expect(readWindows).toBeDefined();
      expect(readUnix.id).toBe(readWindows.id);
      expect(readUnix.nombre).toBe(readWindows.nombre);
    });

    test("2.9 Extreme markdown body sizes with code blocks, tables, and wiki links preserved byte-for-byte", async () => {
      const largeTable = Array.from({ length: 50 }, (_, i) => `| Item ${i} | Valor ${i * 10} | Tag ${i} |`).join("\n");
      const codeBlock = "```typescript\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```";
      const wikiLinks = "[[Ini Rau]] · [[Oca Yary]] · [[MUV Grafica]] · [[Event Master]]";

      const largeBody = `<!-- agente: antigravity -->

# Large Stress Body 🚀

## Links
${wikiLinks}

## Código
${codeBlock}

## Tabela de Dados
| Coluna A | Coluna B | Coluna C |
|---|---|---|
${largeTable}
`;

      await engine.writeVaultNote("Clientes/stress-body.md", {
        id: "stress-body",
        nombre: "Stress Body Test",
        bodyMarkdown: largeBody,
      });

      const read = await engine.readVaultNote("Clientes/stress-body.md");
      expect(read.bodyMarkdown.trim()).toBe(largeBody.trim());
      expect(read.bodyMarkdown).toContain(codeBlock);
      expect(read.bodyMarkdown).toContain(wikiLinks);
      expect(read.bodyMarkdown).toContain("Item 49");
    });
  });
}
