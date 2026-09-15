/**
 * Tier 4: Real-World Scenarios E2E Tests
 * Covers end-to-end production operational workflows:
 * 1. Full startup prefill from Clientes/Nipeihu.md (real-world note)
 * 2. Full startup prefill from Clientes/Digital Alignment.md (real-world note)
 * 3. Complete Company Intake submission with Duplo Núcleo squads, roles, and services
 * 4. Comprehensive da-vault-schema validation audit (replicates npm run vault:check)
 * 5. Full multi-agent orchestration lifecycle: create -> dispatch -> log -> review -> done -> vault sync
 */

import path from "node:path";
import fs from "node:fs";
import { describe, test, expect, beforeEach, afterEach } from "./harness.mjs";
import { createTempVault, createTempStateDir, SAMPLE_COMPANY_INTAKE_PAYLOAD } from "./fixtures.mjs";
import { createTaskStore, createVaultEngine, submitCompanyIntake, syncTaskWithVault } from "./engine.mjs";
import { validateVaultNoteContent } from "./validator.mjs";

export function registerTier4Tests() {
  describe("Tier 4: Real-World Scenarios & Production Acceptance", () => {
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

    test("4.1 Real-world startup prefill from live Clientes/Nipeihu.md extracts all 9 real roadmap tasks and projects", async () => {
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(note).toBeDefined();
      expect(note.id).toBe("nipeihu");
      expect(note.nombre).toBe("Nipeihu");
      expect(note.emoji).toBe("🪶");
      expect(note.rubro).toBe("comunidad_cultura");
      expect(note.dominio).toBe("nipeihu.org");
      expect(note.hosting).toBe("Hostinger (DA)");

      // Projects
      expect(note.proyectos.length).toBe(3);
      expect(note.proyectos[0].nombre).toBe("Nipëi OS (Plataforma Duplo Núcleo)");

      // Roadmap
      expect(note.roadmap.length).toBe(9);
      const doneItems = note.roadmap.filter((item) => item.hecho);
      const pendingItems = note.roadmap.filter((item) => !item.hecho);

      expect(doneItems.length).toBe(3);
      expect(pendingItems.length).toBe(6);

      // Verify specific task items
      const taskDuploNucleo = note.roadmap.find((t) => t.id === "nipei-os-duplo-nucleo");
      expect(taskDuploNucleo.hecho).toBe(true);
      expect(taskDuploNucleo.prioridad).toBe("alta");
      expect(taskDuploNucleo.tags).toContain("sistema");

      const taskGuardianes = note.roadmap.find((t) => t.id === "biografias-guardianes");
      expect(taskGuardianes.hecho).toBe(false);
      expect(taskGuardianes.tags).toContain("contenido");
    });

    test("4.2 Real-world startup prefill from live Clientes/Digital Alignment.md extracts mother agency profile and projects", async () => {
      const da = await engine.readVaultNote("Clientes/Digital Alignment.md");
      expect(da).toBeDefined();
      expect(da.id).toBe("digital-alignment");
      expect(da.nombre).toBe("Digital Alignment");
      expect(da.tipo).toBe("agencia_madre");
      expect(da.emoji).toBe("🏛️");
      expect(da.rubro).toBe("agencia");
      expect(da.dominio).toBe("digitalalignment.com");

      // Verify stack
      expect(da.stack).toContain("TypeScript");
      expect(da.stack).toContain("Vercel");
      expect(da.stack).toContain("Supabase");

      // Verify projects
      expect(da.proyectos.length).toBe(6);
      expect(da.proyectos[0].nombre).toBe("Consola de Administración Inteligente");
      expect(da.proyectos[1].nombre).toBe("Mentoría de Alineación Digital");
    });

    test("4.3 Full Company Intake submission workflow generates valid client note with Duplo Núcleo squads and roles", async () => {
      const intakeResult = await submitCompanyIntake(SAMPLE_COMPANY_INTAKE_PAYLOAD, engine, stateDir);

      expect(intakeResult.success).toBe(true);
      expect(intakeResult.filePath).toBeDefined();
      expect(fs.existsSync(intakeResult.filePath)).toBe(true);

      const createdNote = intakeResult.note;
      expect(createdNote.id).toBe("botica-mutum");
      expect(createdNote.nombre).toBe("Botica Ancestral Mutum");
      expect(createdNote.tipo).toBe("cliente_externo");
      expect(createdNote.rubro).toBe("ecommerce");
      expect(createdNote.emoji).toBe("🌿");
      expect(createdNote.stack).toContain("Supabase");

      // Check Duplo Núcleo metadata in extra
      const squads = createdNote.extra?.squads;
      expect(Array.isArray(squads)).toBe(true);
      expect(squads.length).toBe(2);
      expect(squads[0].nucleus).toBe("sagrado");
      expect(squads[1].nucleus).toBe("comercial");

      // Check local config update in stateDir
      const configJsonPath = path.join(stateDir, "config.json");
      expect(fs.existsSync(configJsonPath)).toBe(true);
      const cfg = JSON.parse(await fs.promises.readFile(configJsonPath, "utf8"));
      expect(cfg.lastIntake.companyId).toBe("botica-mutum");
    });

    test("4.4 Vault compliance audit: runs da-vault-schema validator on generated intake note and verifies 0 errors", async () => {
      await submitCompanyIntake(SAMPLE_COMPANY_INTAKE_PAYLOAD, engine, stateDir);

      const notePath = path.join(vaultDir, "Clientes", "botica-mutum.md");
      const rawContent = await fs.promises.readFile(notePath, "utf8");

      const validation = validateVaultNoteContent(rawContent, "botica-mutum.md");

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Verify no plaintext secrets were persisted
      expect(rawContent).not.toContain("botica-wp-password");
      expect(validation.data.servicios[0].credencial_ref).toBe("botica-wp-token");

      // Verify watermark is present at top of body
      expect(validation.body.trimStart().startsWith("<!-- agente: antigravity -->")).toBe(true);
    });

    test("4.5 End-to-end multi-agent orchestration lifecycle: create -> dispatch -> log -> review -> done -> vault sync", async () => {
      // Step 1: Create task assigned to Claude Code
      const task = await store.createTask({
        id: "task-whisper-api-cantos",
        title: "Whisper API experimental para pronunciación/traducción de cantos",
        description: "Implementar endpoint de transcripción fonética y validación con pajés",
        status: "backlog",
        priority: "baja",
        assignedAgent: "claude",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "whisper-api-cantos",
        tags: ["ia", "audio"],
      });
      expect(task.status).toBe("backlog");

      // Step 2: Dispatch agent -> move to in_progress
      const dispatched = await store.moveTaskStatus(task.id, "in_progress");
      expect(dispatched.status).toBe("in_progress");

      // Step 3: Stream execution logs
      await store.appendLog(task.id, {
        timestamp: "2026-09-04T15:00:00Z",
        message: "Claude Code CLI started: analyzing audio samples in Clientes/Nipeihu/",
        level: "info",
      });
      await store.appendLog(task.id, {
        timestamp: "2026-09-04T15:01:00Z",
        message: "Phonetic tokenizer tuned for Yawanawá consonants (v, k, tx)",
        level: "output",
      });

      // Step 4: Quality gate -> move to review
      const reviewed = await store.moveTaskStatus(task.id, "review");
      expect(reviewed.status).toBe("review");

      // Step 5: Verification complete -> move to done
      const completed = await store.moveTaskStatus(task.id, "done");
      expect(completed.status).toBe("done");

      // Step 6: Sync back to vault note
      const syncResult = await syncTaskWithVault(completed, engine);
      expect(syncResult.synced).toBe(true);

      // Step 7: Verify note in vault
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const vaultItem = note.roadmap.find((item) => item.id === "whisper-api-cantos");

      expect(vaultItem.hecho).toBe(true);
      expect(vaultItem.estado).toBeUndefined(); // Invariant: no intermediate status when hecho is true
      expect(vaultItem.fecha_completado).toBeDefined();

      // Step 8: Validate against da-vault-schema
      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), "utf8");
      const audit = validateVaultNoteContent(raw, "Nipeihu.md");
      expect(audit.valid).toBe(true);
      expect(audit.errors.length).toBe(0);
    });
  });
}
