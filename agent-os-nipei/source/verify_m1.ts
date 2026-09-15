import fs from "node:fs";
import {
  resolveVaultRoot,
  splitFrontmatter,
  readVaultNote,
  parseAllClients,
  writeVaultNote,
} from "./src/lib/vaultSyncEngine";
import { GET as getPrefill } from "./src/app/api/vault/prefill/route";
import { POST as postSync, GET as getSync } from "./src/app/api/vault/sync/route";
import { NextRequest } from "next/server";

async function main() {
  console.log("=== 1. Testing Vault Root Resolution ===");
  const vaultRoot = resolveVaultRoot();
  console.log("Resolved Vault Root:", vaultRoot);
  if (!vaultRoot.includes("digitalalignment")) {
    throw new Error("Expected vault root to resolve to digitalalignment folder");
  }

  console.log("\n=== 2. Testing splitFrontmatter ===");
  const rawSample = "---\nid: test-sample\nnombre: Test Sample\nrubro: agencia\n---\n<!-- agente: antigravity -->\n\n# Body Title\nThis is sample body.";
  const split = splitFrontmatter(rawSample);
  if (!split) throw new Error("splitFrontmatter failed");
  if (split.data.id !== "test-sample" || split.data.nombre !== "Test Sample") {
    throw new Error("splitFrontmatter extracted wrong data");
  }
  if (!split.body.startsWith("<!-- agente: antigravity -->")) {
    throw new Error("splitFrontmatter body does not match expected");
  }
  console.log("splitFrontmatter OK!");

  console.log("\n=== 3. Testing readVaultNote('Clientes/Nipeihu.md') ===");
  const nipeihu = await readVaultNote("Clientes/Nipeihu.md");
  if (!nipeihu) throw new Error("Could not read Clientes/Nipeihu.md");
  console.log("Nipeihu ID:", nipeihu.id);
  console.log("Nipeihu Nombre:", nipeihu.nombre);
  console.log("Nipeihu Tipo:", nipeihu.tipo);
  console.log("Nipeihu Emoji:", nipeihu.emoji);
  console.log("Nipeihu Rubro:", nipeihu.rubro);
  console.log("Nipeihu Stack:", nipeihu.stack?.join(", "));
  console.log("Nipeihu Proyectos count:", nipeihu.proyectos?.length);
  console.log("Nipeihu Roadmap count:", nipeihu.roadmap?.length);
  if (nipeihu.id !== "nipeihu" || nipeihu.nombre !== "Nipeihu") {
    throw new Error("Invalid Nipeihu note data");
  }

  console.log("\n=== 4. Testing readVaultNote('Clientes/Digital Alignment.md') ===");
  const da = await readVaultNote("Clientes/Digital Alignment.md");
  if (!da) throw new Error("Could not read Clientes/Digital Alignment.md");
  console.log("DA ID:", da.id);
  console.log("DA Nombre:", da.nombre);
  console.log("DA Tipo:", da.tipo);
  console.log("DA Roadmap count:", da.roadmap?.length);
  if (da.id !== "digital-alignment" || da.nombre !== "Digital Alignment") {
    throw new Error("Invalid Digital Alignment note data");
  }

  console.log("\n=== 5. Testing parseAllClients() ===");
  const allClients = await parseAllClients();
  console.log("Total parsed clients:", allClients.length);
  const clientIds = allClients.map((c) => c.id);
  console.log("Client IDs:", clientIds.join(", "));
  if (!clientIds.includes("nipeihu") || !clientIds.includes("digital-alignment")) {
    throw new Error("Expected nipeihu and digital-alignment in parsed clients list");
  }

  console.log("\n=== 6. Testing Atomic Write & da-vault-schema Invariants ===");
  const testRelPath = "Clientes/_test_m1_temp.md";
  const writeRes = await writeVaultNote(testRelPath, {
    id: "test-m1-temp",
    nombre: "Test Temp Brand",
    tipo: "cliente_externo",
    rubro: "comunidad_cultura",
    roadmap: [
      { id: "task-done", texto: "Done Task", hecho: true, estado: "en_curso" },
      { id: "task-pending", texto: "Pending Task", hecho: false, estado: "en_curso" },
    ],
    bodyMarkdown: "# Test Note\n\nPreserved body line.",
  });

  if (!writeRes.success || !writeRes.filePath) {
    throw new Error("writeVaultNote failed: " + writeRes.error);
  }
  console.log("Wrote temp note to:", writeRes.filePath);

  const readBack = await readVaultNote(testRelPath);
  if (!readBack) throw new Error("Failed to read back temp note");
  console.log("Invariant check: hecho=true has estado stripped:", readBack.roadmap?.[0]?.estado === undefined);
  console.log("Invariant check: hecho=false preserves estado:", readBack.roadmap?.[1]?.estado === "en_curso");
  console.log("Watermark check:", readBack.bodyMarkdown.startsWith("<!-- agente: antigravity -->"));

  if (readBack.roadmap?.[0]?.estado !== undefined) {
    throw new Error("Task invariant violation: estado was not stripped for completed task");
  }
  if (!readBack.bodyMarkdown.includes("<!-- agente: antigravity -->")) {
    throw new Error("Watermark was not inserted into body");
  }

  // Cleanup test file
  if (fs.existsSync(writeRes.filePath)) {
    fs.unlinkSync(writeRes.filePath);
    const bak = writeRes.filePath + ".bak";
    if (fs.existsSync(bak)) fs.unlinkSync(bak);
    console.log("Cleaned up temp verification file.");
  }

  console.log("\n=== 7. Testing GET /api/vault/prefill Route Handler ===");
  const prefillResponse = await getPrefill();
  const prefillJson = await prefillResponse.json();
  console.log("Prefill Status:", prefillResponse.status);
  console.log("Prefill Success:", prefillJson.success);
  console.log("Company Name:", prefillJson.company?.nombre);
  console.log("Parent Agency:", prefillJson.company?.parentAgency?.nombre);
  console.log("Total Tasks Extracted:", prefillJson.tasks?.length);
  if (!prefillJson.success || !prefillJson.company || prefillJson.tasks?.length === 0) {
    throw new Error("Prefill route did not return expected structure");
  }

  console.log("\n=== 8. Testing POST & GET /api/vault/sync Route Handlers ===");
  // Test GET list
  const mockGetReq = new NextRequest("http://localhost:3000/api/vault/sync");
  const getSyncRes = await getSync(mockGetReq);
  const getSyncJson = await getSyncRes.json();
  console.log("GET /api/vault/sync Count:", getSyncJson.count);
  if (!getSyncJson.success || getSyncJson.count === 0) {
    throw new Error("GET /api/vault/sync failed");
  }

  // Test POST update
  const syncTestPath = "Clientes/_sync_test.md";
  const mockPostReq = new NextRequest("http://localhost:3000/api/vault/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relPath: syncTestPath,
      data: {
        id: "sync-test",
        nombre: "Sync Test Client",
        tipo: "cliente_externo",
        rubro: "agencia",
        roadmap: [{ id: "st-1", texto: "Sync Task 1", hecho: true, estado: "en_curso" }],
      },
      bodyMarkdown: "# Sync Test Body\nSome body notes.",
    }),
  });

  const postSyncRes = await postSync(mockPostReq);
  const postSyncJson = await postSyncRes.json();
  console.log("POST /api/vault/sync Status:", postSyncRes.status);
  console.log("POST /api/vault/sync Success:", postSyncJson.success);
  console.log("POST /api/vault/sync Saved ID:", postSyncJson.note?.id);

  if (!postSyncJson.success || postSyncJson.note?.id !== "sync-test") {
    throw new Error("POST /api/vault/sync failed");
  }

  // Cleanup sync test file
  if (postSyncJson.filePath && fs.existsSync(postSyncJson.filePath)) {
    fs.unlinkSync(postSyncJson.filePath);
    const bak = postSyncJson.filePath + ".bak";
    if (fs.existsSync(bak)) fs.unlinkSync(bak);
    console.log("Cleaned up sync test file.");
  }

  console.log("\n============================================");
  console.log("🎉 ALL TESTS PASSED WITH ZERO DEFECTS! 🎉");
  console.log("============================================");
}

main().catch((err) => {
  console.error("FATAL VERIFICATION FAILURE:", err);
  process.exit(1);
});
