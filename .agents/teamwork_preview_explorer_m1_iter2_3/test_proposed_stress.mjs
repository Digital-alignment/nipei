import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const { createJiti } = require(path.join(sourceDir, "node_modules/jiti"));
const jiti = createJiti(path.join(sourceDir, "package.json"), {
  alias: {
    "@": path.join(sourceDir, "src"),
    "js-yaml": path.join(sourceDir, "node_modules/js-yaml"),
  },
});

// Load the proposed engine!
const vaultSyncEngine = jiti(path.join(__dirname, "proposed_vaultSyncEngine.ts"));

const {
  readVaultNote,
  writeVaultNote,
  parseAllClients,
  splitFrontmatter,
  resolveNotePath,
  resolveVaultRoot,
} = vaultSyncEngine;

// Load prefill route
const prefillModule = jiti(path.join(sourceDir, "src/app/api/vault/prefill/route.ts"));

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name, fn) {
  process.stdout.write(`  [TEST] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`PASSED (${duration}ms)`);
    passedTests++;
    testResults.push({ name, status: "PASS", duration });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAILED (${duration}ms)`);
    console.error(`    Error: ${err.message}`);
    if (err.stack) {
      console.error(`    Stack: ${err.stack.split("\n").slice(1, 4).join("\n")}`);
    }
    failedTests++;
    testResults.push({ name, status: "FAIL", duration, error: err.message });
  }
}

async function createTempVault() {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-challenger-vault-"));
  const clientesDir = path.join(tempDir, "Clientes");
  const productosDir = path.join(tempDir, "Productos");
  await fs.promises.mkdir(clientesDir, { recursive: true });
  await fs.promises.mkdir(productosDir, { recursive: true });

  const liveVault = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";
  const liveNipeihu = path.join(liveVault, "Clientes", "Nipeihu.md");
  const liveDA = path.join(liveVault, "Clientes", "Digital Alignment.md");

  if (fs.existsSync(liveNipeihu)) {
    await fs.promises.copyFile(liveNipeihu, path.join(clientesDir, "Nipeihu.md"));
  }
  if (fs.existsSync(liveDA)) {
    await fs.promises.copyFile(liveDA, path.join(clientesDir, "Digital Alignment.md"));
  }

  return {
    vaultDir: tempDir,
    clientesDir,
    productosDir,
    cleanup: async () => {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

async function main() {
  console.log("======================================================================");
  console.log("    TESTING PROPOSED ENGINE AGAINST CHALLENGER STRESS SUITE           ");
  console.log("======================================================================\n");

  const liveVaultRoot = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";

  // SUITE 1
  console.log("--- SUITE 1: Live Note Parsing & Prefill Accuracy (Real Obsidian Vault) ---");
  await runTest("1.1 Parse live Clientes/Nipeihu.md with exact metadata & invariants", async () => {
    const note = await readVaultNote("Clientes/Nipeihu.md", liveVaultRoot);
    assert(note !== null, "Expected Clientes/Nipeihu.md to be parsed successfully");
    assert(note.id === "nipeihu", `Expected id 'nipeihu', got '${note.id}'`);
    assert(note.nombre === "Nipeihu", `Expected nombre 'Nipeihu', got '${note.nombre}'`);
    assert(note.tipo === "cliente_externo", `Expected tipo 'cliente_externo', got '${note.tipo}'`);
    assert(note.estado === "activo", `Expected estado 'activo', got '${note.estado}'`);
    assert(note.rubro === "comunidad_cultura", `Expected rubro 'comunidad_cultura', got '${note.rubro}'`);
    assert(note.emoji === "🪶", `Expected emoji '🪶', got '${note.emoji}'`);
    assert(note.dominio === "nipeihu.org", `Expected dominio 'nipeihu.org', got '${note.dominio}'`);
    assert(Array.isArray(note.stack) && note.stack.length >= 8, `Expected >= 8 stack items, got ${note.stack?.length}`);
    assert(Array.isArray(note.proyectos) && note.proyectos.length === 4, `Expected 4 proyectos, got ${note.proyectos?.length}`);
    assert(Array.isArray(note.roadmap) && note.roadmap.length === 9, `Expected 9 roadmap items, got ${note.roadmap?.length}`);
    
    const doneItems = note.roadmap.filter((r) => r.hecho);
    assert(doneItems.length === 3, `Expected 3 done roadmap items, got ${doneItems.length}`);
    for (const d of doneItems) {
      assert(d.estado === undefined, `Done item '${d.id}' must NOT have intermediate estado, but got '${d.estado}'`);
      assert(d.fecha_completado !== undefined, `Done item '${d.id}' must have fecha_completado`);
    }

    assert(typeof note.bodyMarkdown === "string", "bodyMarkdown must be a string");
    assert(note.bodyMarkdown.includes("# Nipeihu 🪶"), "bodyMarkdown must contain '# Nipeihu 🪶'");
    assert(note.bodyMarkdown.includes("<!-- agente: antigravity -->"), "bodyMarkdown must contain watermark");
  });

  await runTest("1.2 Parse live Clientes/Digital Alignment.md with folded YAML & notebook_id", async () => {
    const note = await readVaultNote("Clientes/Digital Alignment.md", liveVaultRoot);
    assert(note !== null, "Expected Clientes/Digital Alignment.md to be parsed successfully");
    assert(note.id === "digital-alignment", `Expected id 'digital-alignment', got '${note.id}'`);
    assert(note.nombre === "Digital Alignment", `Expected nombre 'Digital Alignment', got '${note.nombre}'`);
    assert(note.tipo === "agencia_madre", `Expected tipo 'agencia_madre', got '${note.tipo}'`);
    assert(note.emoji === "🏛️", `Expected emoji '🏛️', got '${note.emoji}'`);
    assert(note.rubro === "agencia", `Expected rubro 'agencia', got '${note.rubro}'`);
    assert(note.dominio === "digitalalignment.com", `Expected dominio 'digitalalignment.com', got '${note.dominio}'`);
    assert(note.extra?.notebook_id === "5ffd7044-bdde-410e-b096-b65fd0c3838c" || note.notebook_id === "5ffd7044-bdde-410e-b096-b65fd0c3838c", "notebook_id must be preserved");
    
    const foldedRoadmap = note.roadmap?.find((r) => r.id === "repo-dotfiles-config-agentes");
    assert(foldedRoadmap !== undefined, "Expected roadmap item 'repo-dotfiles-config-agentes'");
    assert(foldedRoadmap.texto.includes("Crear el repo Digital-alignment/dotfiles"), "Folded text must be parsed into single string");
    assert(!foldedRoadmap.texto.includes(">-"), "Folded indicator '>-' must not leak into string value");

    assert(Array.isArray(note.historial) && note.historial.length === 1, "Expected 1 historial item");
    assert(note.historial[0].texto.includes("Command Center gana validador"), "Historial text must be parsed");
  });

  await runTest("1.3 Execute Prefill Route handler against live vault", async () => {
    const fakeReq = {
      url: `http://localhost:3000/api/vault/prefill?vaultRoot=${encodeURIComponent(liveVaultRoot)}`,
    };
    const response = await prefillModule.GET(fakeReq);
    assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
    const body = await response.json();
    assert(body.success === true, "Expected success: true");
    assert(body.source === "obsidian_vault", "Expected source: 'obsidian_vault'");
    assert(body.company !== null, "Company profile must not be null");
    assert(body.company.id === "nipeihu", `Expected company id 'nipeihu', got '${body.company.id}'`);
  });

  // SUITE 2
  console.log("\n--- SUITE 2: Body Markdown Preservation & Boundary Edge Cases ---");
  await runTest("2.1 Body markdown byte-for-byte exactness across multiple updates", async () => {
    const sandbox = await createTempVault();
    try {
      const initial = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      const initialBody = initial.bodyMarkdown;

      for (let i = 1; i <= 5; i++) {
        await writeVaultNote("Clientes/Nipeihu.md", { categoria: `Iteration ${i} description` }, sandbox.vaultDir);
        const reRead = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
        assert(reRead.bodyMarkdown.trim() === initialBody.trim(), `Body mutated at iteration ${i}!`);
        assert(reRead.categoria === `Iteration ${i} description`, `Frontmatter not updated at iteration ${i}`);
      }
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("2.2 Note with internal horizontal rules (---) in body markdown does not truncate", async () => {
    const sandbox = await createTempVault();
    try {
      const complexBody = `<!-- agente: antigravity -->

# Brand with Horizontal Rules

Section 1 content before rule.

---

Section 2 content between rules.

---

Section 3 final text at the end of the document.
`;
      await writeVaultNote("Clientes/hr-test.md", {
        id: "hr-test",
        nombre: "HR Test Brand",
        bodyMarkdown: complexBody,
      }, sandbox.vaultDir);

      const note = await readVaultNote("Clientes/hr-test.md", sandbox.vaultDir);
      assert(note !== null, "Note must parse");
      assert(note.bodyMarkdown.includes("Section 1 content before rule."), "Must contain Section 1");
      assert(note.bodyMarkdown.includes("Section 2 content between rules."), "Must contain Section 2");
      assert(note.bodyMarkdown.includes("Section 3 final text at the end of the document."), "Must contain Section 3");

      await writeVaultNote("Clientes/hr-test.md", { estado: "pausado" }, sandbox.vaultDir);
      const noteAfter = await readVaultNote("Clientes/hr-test.md", sandbox.vaultDir);
      assert(noteAfter.estado === "pausado", "Frontmatter must be updated");
      assert(noteAfter.bodyMarkdown.includes("Section 3 final text at the end of the document."), "Body was truncated by internal '---'!");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("2.3 Watermark is not duplicated upon multiple rewrites", async () => {
    const sandbox = await createTempVault();
    try {
      for (let i = 0; i < 5; i++) {
        await writeVaultNote("Clientes/Nipeihu.md", { estado: "activo" }, sandbox.vaultDir);
      }
      const raw = await fs.promises.readFile(path.join(sandbox.clientesDir, "Nipeihu.md"), "utf8");
      const occurrences = (raw.match(/<!-- agente: antigravity -->/g) || []).length;
      assert(occurrences === 1, `Expected exactly 1 watermark occurrence, but found ${occurrences}`);
    } finally {
      await sandbox.cleanup();
    }
  });

  // SUITE 3
  console.log("\n--- SUITE 3: High-Concurrency & Race Condition Stress Tests ---");
  await runTest("3.1 20 Concurrent writes to the SAME file path (parallel Promise.all)", async () => {
    const sandbox = await createTempVault();
    try {
      const filePath = "Clientes/Nipeihu.md";
      const initial = await readVaultNote(filePath, sandbox.vaultDir);
      const initialBody = initial.bodyMarkdown;

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          writeVaultNote(
            filePath,
            {
              categoria: `Concurrent test update #${i}`,
              extra: { [`test_key_${i}`]: `val_${i}` },
            },
            sandbox.vaultDir
          )
        );
      }

      const results = await Promise.all(promises);
      for (let i = 0; i < results.length; i++) {
        assert(results[i].success === true, `Write #${i} failed: ${results[i].error}`);
      }

      const finalNote = await readVaultNote(filePath, sandbox.vaultDir);
      assert(finalNote !== null, "Final note must parse cleanly as YAML");
      assert(finalNote.bodyMarkdown.trim() === initialBody.trim(), "Body corrupted during concurrent writes!");

      const dirFiles = await fs.promises.readdir(sandbox.clientesDir);
      const tmpFiles = dirFiles.filter((f) => f.endsWith(".tmp"));
      assert(tmpFiles.length === 0, `Dangling .tmp files found: ${tmpFiles.join(", ")}`);
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("3.2 Path representation & casing collision under concurrent writes", async () => {
    const sandbox = await createTempVault();
    try {
      const variations = [
        "Clientes/Nipeihu.md",
        "Clientes/nipeihu.md",
        "nipeihu",
        "Clientes/NIPEHU.MD",
        path.join(sandbox.vaultDir, "Clientes", "Nipeihu.md"),
      ];

      const promises = variations.map((relOrAbs, idx) =>
        writeVaultNote(
          relOrAbs,
          {
            hosting: `Hostinger Variation #${idx}`,
          },
          sandbox.vaultDir
        )
      );

      const results = await Promise.all(promises);
      for (let i = 0; i < results.length; i++) {
        assert(results[i].success === true, `Variation #${i} (${variations[i]}) failed: ${results[i].error}`);
      }

      const note = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      assert(note !== null, "Note must be readable after variation writes");
      assert(note.nombre === "Nipeihu", "Nombre must be preserved");
      assert(note.bodyMarkdown.includes("# Nipeihu 🪶"), "Body must not be corrupted");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("3.3 Read-during-write stress test (25 writes + 25 reads interleaved)", async () => {
    const sandbox = await createTempVault();
    try {
      const noteRel = "Clientes/Nipeihu.md";
      const operations = [];
      const readOutputs = [];

      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          operations.push(
            writeVaultNote(
              noteRel,
              {
                categoria: `Interleaved write #${i}`,
              },
              sandbox.vaultDir
            )
          );
        } else {
          operations.push(
            (async () => {
              const res = await readVaultNote(noteRel, sandbox.vaultDir);
              readOutputs.push(res);
              return { read: true, res };
            })()
          );
        }
      }

      await Promise.all(operations);
      assert(readOutputs.length === 25, `Expected 25 reads, got ${readOutputs.length}`);
      for (let i = 0; i < readOutputs.length; i++) {
        const read = readOutputs[i];
        assert(read !== null, `Read #${i} returned null during concurrent write!`);
        assert(read.id === "nipeihu", `Read #${i} returned bad id: ${read?.id}`);
        assert(read.bodyMarkdown.includes("# Nipeihu 🪶"), `Read #${i} returned corrupted body!`);
      }
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("3.4 Multi-process concurrent write stress (Child processes writing simultaneously)", async () => {
    const sandbox = await createTempVault();
    const workerScript = path.join(sandbox.vaultDir, "worker_writer.mjs");

    const code = `
      import path from "node:path";
      import { createRequire } from "node:module";
      const require = createRequire(import.meta.url);
      const { createJiti } = require(${JSON.stringify(path.resolve(__dirname, "../../agent-os-nipei/source/node_modules/jiti"))});
      const jiti = createJiti(${JSON.stringify(path.join(sourceDir, "package.json"))}, {
        alias: {
          "@": ${JSON.stringify(path.join(sourceDir, "src"))},
          "js-yaml": ${JSON.stringify(path.join(sourceDir, "node_modules/js-yaml"))},
        },
      });
      const { writeVaultNote } = jiti(${JSON.stringify(path.resolve(__dirname, "proposed_vaultSyncEngine.ts"))});

      const [,, vaultDir, id] = process.argv;

      async function run() {
        for (let i = 0; i < 5; i++) {
          const res = await writeVaultNote("Clientes/Nipeihu.md", {
            categoria: "Process " + id + " iteration " + i
          }, vaultDir);
          if (!res.success) {
            console.error("CHILD ERR in " + id + " iter " + i + ": " + res.error);
            process.exit(1);
          }
        }
        process.exit(0);
      }
      run();
    `;
    await fs.promises.writeFile(workerScript, code, "utf8");

    try {
      const proc1 = fork(workerScript, [sandbox.vaultDir, "P1"]);
      const proc2 = fork(workerScript, [sandbox.vaultDir, "P2"]);
      const proc3 = fork(workerScript, [sandbox.vaultDir, "P3"]);

      const waitForExit = (p) =>
        new Promise((resolve, reject) => {
          p.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Process exited with code ${code}`));
          });
          p.on("error", reject);
        });

      await Promise.all([waitForExit(proc1), waitForExit(proc2), waitForExit(proc3)]);

      const finalNote = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      assert(finalNote !== null, "File must parse after multi-process writes");
      assert(finalNote.bodyMarkdown.includes("# Nipeihu 🪶"), "Body must not be corrupted by multi-process writes");
    } finally {
      await sandbox.cleanup();
    }
  });

  // SUITE 4
  console.log("\n--- SUITE 4: da-vault-schema Invariants & Adversarial Verification ---");
  await runTest("4.1 Strip forbidden secret keys (password, api_key, token, clave)", async () => {
    const sandbox = await createTempVault();
    try {
      await writeVaultNote("Clientes/Nipeihu.md", {
        servicios: [
          {
            id: "s-1",
            tipo: "wordpress",
            nombre: "WP Admin",
            usuario: "admin",
            password: "CRITICAL_SECRET_PASSWORD",
            token: "SECRET_TOKEN_XYZ",
            apiKey: "API_KEY_123",
            contraseña: "CLAVE_SECRETA",
            credencial_ref: "vault-ref-only",
            estado: "configurado",
          },
        ],
      }, sandbox.vaultDir);

      const raw = await fs.promises.readFile(path.join(sandbox.clientesDir, "Nipeihu.md"), "utf8");
      assert(!raw.includes("CRITICAL_SECRET_PASSWORD"), "Password was not stripped!");
      assert(!raw.includes("SECRET_TOKEN_XYZ"), "Token was not stripped!");
      assert(!raw.includes("API_KEY_123"), "apiKey was not stripped!");
      assert(!raw.includes("CLAVE_SECRETA"), "contraseña was not stripped!");
      assert(raw.includes("vault-ref-only"), "credencial_ref must be preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("4.2 Roadmap invariant: hecho: true deletes estado and sets fecha_completado", async () => {
    const sandbox = await createTempVault();
    try {
      await writeVaultNote("Clientes/Nipeihu.md", {
        roadmap: [
          {
            id: "task-done-check",
            texto: "Done task invariant test",
            prioridad: "urgente",
            hecho: true,
            estado: "en_curso",
          },
          {
            id: "task-pending-check",
            texto: "Pending task",
            prioridad: "media",
            hecho: false,
            estado: "en_curso",
          },
        ],
      }, sandbox.vaultDir);

      const note = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      assert(note !== null, "Note must parse");
      
      const tDone = note.roadmap?.find((r) => r.id === "task-done-check");
      assert(tDone.hecho === true, "Task must be marked done");
      assert(tDone.estado === undefined, "hecho: true MUST strip intermediate estado");
      assert(typeof tDone.fecha_completado === "string", "hecho: true MUST set fecha_completado");

      const tPending = note.roadmap?.find((r) => r.id === "task-pending-check");
      assert(tPending.hecho === false, "Task must be pending");
      assert(tPending.estado === "en_curso", "Pending task must preserve intermediate estado");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("4.3 Graceful rejection of invalid notes missing id or nombre", async () => {
    const sandbox = await createTempVault();
    try {
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "InvalidNoId.md"),
        `---\nnombre: No ID Brand\n---\nBody here\n`,
        "utf8"
      );
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "InvalidNoName.md"),
        `---\nid: no-name\n---\nBody here\n`,
        "utf8"
      );

      const res1 = await readVaultNote("Clientes/InvalidNoId.md", sandbox.vaultDir);
      assert(res1 === null, "Note without id must be discarded (return null)");

      const res2 = await readVaultNote("Clientes/InvalidNoName.md", sandbox.vaultDir);
      assert(res2 === null, "Note without nombre must be discarded (return null)");

      const all = await parseAllClients(sandbox.vaultDir);
      const ids = all.map((a) => a.id);
      assert(!ids.includes("no-name"), "Invalid notes must not appear in parseAllClients");
    } finally {
      await sandbox.cleanup();
    }
  });

  console.log("\n======================================================================");
  console.log("                        EXECUTION RESULTS                             ");
  console.log("======================================================================");
  console.log(`Total Stress Tests: ${passedTests + failedTests}`);
  console.log(`Passed:             ${passedTests}`);
  console.log(`Failed:             ${failedTests}`);
  console.log("======================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal stress runner error:", err);
  process.exit(1);
});
