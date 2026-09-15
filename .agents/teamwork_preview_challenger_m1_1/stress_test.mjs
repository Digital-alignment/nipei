/**
 * Empirical Stress Test Suite for Nipëi OS Milestone 1 (Vault Engine & Sync)
 * Challenger M1_1
 * 
 * Verifies:
 * - Unicode, diacritics, multilingual characters
 * - Multi-codepoint emojis (ZWJ, skin tone, flags)
 * - BOM and markdown horizontal rules preservation
 * - Malformed YAML frontmatter silent degradation
 * - Missing mandatory keys (id, nombre) rejection
 * - Support notes (_*.md) exclusion
 * - da-vault-schema task invariants (hecho: true strips estado)
 * - Plaintext secret purging in servicios
 * - Mutex file locking, concurrency, and backup (.bak) creation
 * - Real prefill endpoint logic simulation
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Load production vaultSyncEngine via jiti
let vaultEngine;
try {
  const jitiFactory = require("../../agent-os-nipei/source/node_modules/jiti");
  const jiti = jitiFactory(import.meta.url);
  vaultEngine = jiti("../../agent-os-nipei/source/src/lib/vaultSyncEngine.ts");
} catch (err) {
  console.error("Failed to load vaultSyncEngine via jiti:", err);
  process.exit(1);
}

const {
  readVaultNote,
  writeVaultNote,
  parseAllClients,
  splitFrontmatter,
  resolveVaultRoot,
} = vaultEngine;

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failedTests++;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedTests++;
    console.log(`  PASS: ${message}`);
  }
}

async function runTests() {
  console.log("======================================================================");
  console.log("     CHALLENGER M1_1 — EMPIRICAL STRESS & ADVERSARIAL TEST SUITE      ");
  console.log("======================================================================\n");

  const tempVaultDir = path.join(os.tmpdir(), `nipei-stress-vault-${Date.now()}`);
  fs.mkdirSync(path.join(tempVaultDir, "Clientes"), { recursive: true });
  fs.mkdirSync(path.join(tempVaultDir, "Productos"), { recursive: true });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unicode, Accents, Diacritics, Multilingual Text
    // -------------------------------------------------------------------------
    console.log("[1/8] Testing Unicode, Accents, and Multilingual Text Fidelity...");
    {
      const unicodeNotePath = "Clientes/Ñandú Térmico.md";
      const complexNombre = "Ñandú & Inî Rau Café — São Cristóvão";
      const complexCategoria = "Turismo de retiros ecológicos, culinária & saúde 🌿";
      const complexBody = `<!-- agente: antigravity -->

# ${complexNombre}
Notas operacionais com caracteres especiais:
- Letras com acento: á, é, í, ó, ú, ñ, ç, ã, õ, ê, à, ü.
- Guaraní & Tupi: Nipëi, Inî Rau, Mbyja, Ara Pyau.
- Caracteres multilíngues: 日本語テキスト, Русский текст, العربية.
- Símbolos: €100, $500, ©2026, ¶, §, —, –, "aspas duplas", 'simples'.
`;
      const writeResult = await writeVaultNote(
        unicodeNotePath,
        {
          id: "nandu-termico",
          nombre: complexNombre,
          categoria: complexCategoria,
          bodyMarkdown: complexBody,
          roadmap: [
            {
              id: "tarefa-acento",
              texto: "Implementação da interface com acentuação estrita & símbolos — €50",
              prioridad: "alta",
              hecho: false,
              estado: "en_curso",
            },
          ],
        },
        tempVaultDir
      );

      assert(writeResult.success === true, "Write operation succeeded for Unicode note");
      const readBack = await readVaultNote("Clientes/Ñandú Térmico.md", tempVaultDir);
      assert(readBack !== null, "Unicode note could be parsed back");
      assert(readBack.nombre === complexNombre, "Brand nombre preserved exactly with all diacritics");
      assert(readBack.categoria === complexCategoria, "Brand categoria preserved with UTF-8 characters");
      assert(readBack.roadmap[0].texto.includes("Implementação da interface"), "Roadmap item preserves Portuguese diacritics");
      assert(readBack.roadmap[0].texto.includes("€50"), "Currency symbols preserved");
      assert(readBack.bodyMarkdown.includes("Guaraní & Tupi: Nipëi, Inî Rau"), "Body markdown preserves indigenous orthography");
      assert(readBack.bodyMarkdown.includes("日本語テキスト"), "Body markdown preserves CJK characters");
    }

    // -------------------------------------------------------------------------
    // TEST 2: Complex Multi-Codepoint Emojis (Surrogate Pairs, ZWJ, Skin Tone, Flags)
    // -------------------------------------------------------------------------
    console.log("\n[2/8] Testing Complex Emojis (ZWJ Sequences, Skin Tone, Flags)...");
    {
      const emojiNotePath = "Clientes/Emoji Test.md";
      const multiCodepointEmoji = "👨‍💻"; // Man technologist: U+1F468 U+200D U+1F4BB
      const flagEmoji = "🇦🇷"; // Regional indicators
      const skinToneEmoji = "👍🏽"; // Thumb up medium skin tone
      const rainbowFlag = "🏳️‍🌈";

      const writeResult = await writeVaultNote(
        emojiNotePath,
        {
          id: "emoji-stress",
          nombre: `Matrix OS ${multiCodepointEmoji} ${flagEmoji}`,
          emoji: multiCodepointEmoji,
          categoria: `Sistemas autônomos ${skinToneEmoji} ${rainbowFlag}`,
          roadmap: [
            {
              id: "emoji-task",
              texto: `Subir release para produção ${multiCodepointEmoji} e verificar flags ${flagEmoji}`,
              hecho: false,
            },
          ],
          bodyMarkdown: `<!-- agente: antigravity -->\n\n# Emojis ${rainbowFlag} ${skinToneEmoji}\n`,
        },
        tempVaultDir
      );

      assert(writeResult.success === true, "Written note with complex emoji sequences");
      const readEmoji = await readVaultNote(emojiNotePath, tempVaultDir);
      assert(readEmoji !== null, "Parsed back note with emojis");
      assert(readEmoji.emoji === multiCodepointEmoji, "Multi-codepoint ZWJ emoji preserved intact");
      assert(readEmoji.nombre.includes(flagEmoji), "Flag emoji (regional indicators) preserved in nombre");
      assert(readEmoji.categoria.includes(skinToneEmoji), "Skin tone modifier emoji preserved in categoria");
      assert(readEmoji.bodyMarkdown.includes(rainbowFlag), "Rainbow flag ZWJ sequence preserved in body");
    }

    // -------------------------------------------------------------------------
    // TEST 3: UTF-8 BOM Handling and Markdown Horizontal Rules in Body
    // -------------------------------------------------------------------------
    console.log("\n[3/8] Testing UTF-8 BOM and Embedded Horizontal Rules in Body...");
    {
      // 1. Note with UTF-8 BOM
      const bomContent = "\uFEFF---\nid: bom-note\nnombre: Nota com BOM\ntipo: cliente_externo\n---\n\n<!-- agente: antigravity -->\n\nConteúdo após BOM\n";
      const bomFilePath = path.join(tempVaultDir, "Clientes", "BomNote.md");
      await fs.promises.writeFile(bomFilePath, bomContent, "utf8");

      const parsedBom = await readVaultNote("Clientes/BomNote.md", tempVaultDir);
      assert(parsedBom !== null, "Note starting with UTF-8 BOM successfully parsed");
      assert(parsedBom.id === "bom-note", "BOM note ID parsed correctly");

      // 2. Note with horizontal rules (---) inside the markdown body
      const hrNotePath = "Clientes/HorizontalRules.md";
      const hrBody = `<!-- agente: antigravity -->

# Documentação com Linhas Divisórias

Seção 1
---
Seção 2
---
Seção 3
---
Fim do documento.
`;
      await writeVaultNote(
        hrNotePath,
        {
          id: "hr-note",
          nombre: "Nota com Divisórias",
          bodyMarkdown: hrBody,
        },
        tempVaultDir
      );

      const parsedHr = await readVaultNote(hrNotePath, tempVaultDir);
      assert(parsedHr !== null, "Note with internal horizontal rules parsed");
      assert(parsedHr.id === "hr-note", "Note ID intact despite internal '---' delimiters");
      assert(parsedHr.bodyMarkdown.includes("Seção 1\n---\nSeção 2\n---\nSeção 3"), "All embedded '---' dividers in body remained uncorrupted");
    }

    // -------------------------------------------------------------------------
    // TEST 4: Malformed YAML Frontmatter Silent Degradation
    // -------------------------------------------------------------------------
    console.log("\n[4/8] Testing Malformed YAML Frontmatter Silent Degradation...");
    {
      // Case 4.1: Unclosed frontmatter (only opening ---)
      const unclosedPath = path.join(tempVaultDir, "Clientes", "Unclosed.md");
      await fs.promises.writeFile(unclosedPath, "---\nid: test\nnombre: Unclosed note\nNo closing delimiter here", "utf8");
      const unclosedRead = await readVaultNote("Clientes/Unclosed.md", tempVaultDir);
      assert(unclosedRead === null, "Unclosed frontmatter returns null (silent degradation)");

      // Case 4.2: Invalid YAML syntax (unquoted colons, invalid indentation)
      const syntaxErrorPath = path.join(tempVaultDir, "Clientes", "SyntaxError.md");
      await fs.promises.writeFile(syntaxErrorPath, "---\nid: test\nnombre: [broken yaml: : {\n---\n\nBody", "utf8");
      const syntaxRead = await readVaultNote("Clientes/SyntaxError.md", tempVaultDir);
      assert(syntaxRead === null, "Invalid YAML syntax returns null without throwing");

      // Case 4.3: Pure markdown note without frontmatter
      const noFmPath = path.join(tempVaultDir, "Clientes", "NoFrontmatter.md");
      await fs.promises.writeFile(noFmPath, "# Pure Markdown\n\nNo frontmatter delimiters here.", "utf8");
      const noFmRead = await readVaultNote("Clientes/NoFrontmatter.md", tempVaultDir);
      assert(noFmRead === null, "Markdown note without YAML frontmatter returns null");

      // Case 4.4: Frontmatter that is an array instead of object
      const arrayFmPath = path.join(tempVaultDir, "Clientes", "ArrayFm.md");
      await fs.promises.writeFile(arrayFmPath, "---\n- item1\n- item2\n---\n\nBody", "utf8");
      const arrayRead = await readVaultNote("Clientes/ArrayFm.md", tempVaultDir);
      assert(arrayRead === null, "Frontmatter parsing to array returns null");
    }

    // -------------------------------------------------------------------------
    // TEST 5: Mandatory Fields (id, nombre) and Support Note Filtering
    // -------------------------------------------------------------------------
    console.log("\n[5/8] Testing Mandatory Keys (id, nombre) and Support Notes (_*.md)...");
    {
      // Case 5.1: Missing 'id'
      const missingIdPath = path.join(tempVaultDir, "Clientes", "MissingId.md");
      await fs.promises.writeFile(missingIdPath, "---\nnombre: Sem ID\ntipo: cliente_externo\n---\n\nBody", "utf8");
      const missingIdRead = await readVaultNote("Clientes/MissingId.md", tempVaultDir);
      assert(missingIdRead === null, "Note missing mandatory 'id' is discarded");

      // Case 5.2: Missing 'nombre'
      const missingNombrePath = path.join(tempVaultDir, "Clientes", "MissingNombre.md");
      await fs.promises.writeFile(missingNombrePath, "---\nid: sem-nombre\ntipo: cliente_externo\n---\n\nBody", "utf8");
      const missingNombreRead = await readVaultNote("Clientes/MissingNombre.md", tempVaultDir);
      assert(missingNombreRead === null, "Note missing mandatory 'nombre' is discarded");

      // Case 5.3: Support notes starting with '_'
      const support1 = path.join(tempVaultDir, "Clientes", "_Ecosistema.md");
      const support2 = path.join(tempVaultDir, "Clientes", "_Infraestructura.md");
      await fs.promises.writeFile(support1, "---\nid: ecosistema\nnombre: Ecosistema\n---\n\nSuporte", "utf8");
      await fs.promises.writeFile(support2, "---\nid: infra\nnombre: Infra\n---\n\nSuporte", "utf8");

      const allClients = await parseAllClients(tempVaultDir);
      const hasSupportNote = allClients.some((c) => c.id === "ecosistema" || c.id === "infra");
      assert(!hasSupportNote, "parseAllClients() strictly excludes support notes starting with '_'");
    }

    // -------------------------------------------------------------------------
    // TEST 6: da-vault-schema Invariants (hecho: true vs estado, secret purging)
    // -------------------------------------------------------------------------
    console.log("\n[6/8] Testing Schema Invariants & Plaintext Secret Purging...");
    {
      const invariantNotePath = "Clientes/Invariants.md";
      const writeResult = await writeVaultNote(
        invariantNotePath,
        {
          id: "invariants-brand",
          nombre: "Invariants Brand",
          roadmap: [
            {
              id: "task-done-with-intermediate-status",
              texto: "Tarefa concluída que tinha estado intermediário",
              prioridad: "alta",
              hecho: true,
              estado: "en_curso", // Contradiction: hecho: true cannot have intermediate estado!
            },
            {
              id: "task-not-done-with-status",
              texto: "Tarefa em andamento",
              hecho: false,
              estado: "en_curso",
            },
          ],
          servicios: [
            {
              id: "wp-admin",
              tipo: "wordpress",
              nombre: "WordPress Admin",
              usuario: "admin_user",
              password: "super_secret_password_12345", // FORBIDDEN: Plaintext password!
              token: "bearer_token_xyz987",            // FORBIDDEN: Plaintext token!
              apiKey: "api_key_secret_abc",            // FORBIDDEN: Plaintext apiKey!
              credencial_ref: "safe-wp-vault-ref",     // ALLOWED: Reference only!
            },
          ],
        },
        tempVaultDir
      );

      assert(writeResult.success === true, "Written note testing invariants");
      const parsed = await readVaultNote(invariantNotePath, tempVaultDir);
      assert(parsed !== null, "Parsed invariants note");

      // Verify task invariant:
      const taskDone = parsed.roadmap.find((t) => t.id === "task-done-with-intermediate-status");
      assert(taskDone.hecho === true, "Task is marked hecho: true");
      assert(!taskDone.estado || taskDone.estado === "hecha", "Intermediate estado 'en_curso' was stripped for done task");
      
      const fileOnDisk = await fs.promises.readFile(path.join(tempVaultDir, "Clientes", "Invariants.md"), "utf8");
      assert(!fileOnDisk.includes("super_secret_password_12345"), "Plaintext password was completely PURGED from saved file");
      assert(!fileOnDisk.includes("bearer_token_xyz987"), "Plaintext token was completely PURGED from saved file");
      assert(!fileOnDisk.includes("api_key_secret_abc"), "Plaintext apiKey was completely PURGED from saved file");
      assert(fileOnDisk.includes("safe-wp-vault-ref"), "Safe credencial_ref was preserved");
    }

    // -------------------------------------------------------------------------
    // TEST 7: Atomic Concurrency, Mutex, and Backup (.bak) Generation
    // -------------------------------------------------------------------------
    console.log("\n[7/8] Testing Atomic Write Concurrency, Mutex, and .bak Backups...");
    {
      const concurrentNotePath = "Clientes/ConcurrentStress.md";
      // Initial note
      await writeVaultNote(
        concurrentNotePath,
        {
          id: "concurrent-stress",
          nombre: "Concurrent Stress Initial",
          categoria: "Versão inicial",
        },
        tempVaultDir
      );

      const targetFullPath = path.join(tempVaultDir, "Clientes", "ConcurrentStress.md");
      const bakPath = `${targetFullPath}.bak`;

      // Launch 8 concurrent writes with different values in parallel
      const writePromises = [];
      for (let i = 1; i <= 8; i++) {
        writePromises.push(
          writeVaultNote(
            concurrentNotePath,
            {
              id: "concurrent-stress",
              nombre: `Concurrent Stress Update #${i}`,
              categoria: `Versão paralela #${i}`,
              extra: { iteration: i },
            },
            tempVaultDir
          )
        );
      }

      const results = await Promise.all(writePromises);
      const allSucceeded = results.every((r) => r.success === true);
      assert(allSucceeded, "All 8 concurrent writes succeeded without torn write or lock collision");

      // Check backup file exists
      assert(fs.existsSync(bakPath), "Backup file (.bak) was created during atomic write");

      // Verify file is fully readable and not corrupted
      const finalRead = await readVaultNote(concurrentNotePath, tempVaultDir);
      assert(finalRead !== null, "Note readable and valid YAML after 8 parallel writes");
      assert(finalRead.id === "concurrent-stress", "Note ID preserved correctly");

      // Verify no dangling .tmp files in Clientes/
      const clientsFiles = await fs.promises.readdir(path.join(tempVaultDir, "Clientes"));
      const danglingTmp = clientsFiles.filter((f) => f.includes(".tmp"));
      assert(danglingTmp.length === 0, `No dangling .tmp files remained (found: ${danglingTmp.length})`);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Prefill Parsing Fidelity on Real-World Notes
    // -------------------------------------------------------------------------
    console.log("\n[8/8] Testing Real-World Vault Notes Parsing (Nipeihu.md)...");
    {
      const realVaultRoot = resolveVaultRoot();
      const nipeihuPath = "Clientes/Nipeihu.md";
      const nipeihu = await readVaultNote(nipeihuPath);

      if (nipeihu) {
        assert(nipeihu.id === "nipeihu", "Real Clientes/Nipeihu.md parsed with id 'nipeihu'");
        assert(nipeihu.nombre === "Nipeihu", "Real Clientes/Nipeihu.md parsed with nombre 'Nipeihu'");
        assert(Array.isArray(nipeihu.roadmap), "Roadmap items parsed as array");
        assert(nipeihu.roadmap.length > 0, `Roadmap has ${nipeihu.roadmap.length} items`);
        assert(nipeihu.bodyMarkdown.length > 0, "Body markdown preserved from live vault note");
      } else {
        console.warn("  WARN: Live Clientes/Nipeihu.md not found at default vault path, skipping real note assertion");
      }
    }

    console.log("\n======================================================================");
    console.log(`TEST RESULTS: ${passedTests} passed, ${failedTests} failed`);
    console.log("======================================================================\n");

    if (failedTests > 0) {
      console.error("FAILURES:\n" + failures.map((f) => ` - ${f}`).join("\n"));
      process.exit(1);
    } else {
      console.log("ALL EMPIRICAL STRESS TESTS PASSED CLEANLY!");
      process.exit(0);
    }
  } finally {
    // Cleanup temporary vault
    try {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

runTests().catch((err) => {
  console.error("Fatal error in stress test suite:", err);
  process.exit(1);
});
