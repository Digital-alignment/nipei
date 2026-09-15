import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const { createJiti } = require("../../agent-os-nipei/source/node_modules/jiti");
const jiti = createJiti(path.join(sourceDir, "package.json"), {
  alias: {
    "@": path.join(sourceDir, "src"),
  },
});

// Load the actual production engine
const vaultSyncEngine = jiti("./src/lib/vaultSyncEngine.ts");

const {
  readVaultNote,
  writeVaultNote,
  parseAllClients,
  splitFrontmatter,
  resolveNotePath,
  resolveVaultRoot,
  withFileLock,
  getLockKey,
} = vaultSyncEngine;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`  [TEST ${totalTests}] ${name} ... `);
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
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-challenger-iter2-"));
  const clientesDir = path.join(tempDir, "Clientes");
  const productosDir = path.join(tempDir, "Productos");
  await fs.promises.mkdir(clientesDir, { recursive: true });
  await fs.promises.mkdir(productosDir, { recursive: true });

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
  console.log("   CHALLENGER M1_ITER2_1 — EMPIRICAL ADVERSARIAL STRESS TEST SUITE   ");
  console.log("======================================================================");

  // ====================================================================
  // SUITE 1: UNICODE CHARACTERS & MULTI-LINGUAL SUPPORT
  // ====================================================================
  console.log("\n--- SUITE 1: UNICODE CHARACTERS (CJK, Cyrillic, RTL, Math, Symbols) ---");

  await runTest("1.1 Roundtrip CJK characters in frontmatter and markdown body", async () => {
    const sandbox = await createTempVault();
    try {
      const cjkNote = {
        id: "tokyo-digital-alignment",
        nombre: "東京デジタル・アライメント — 日本語版 🌸",
        categoria: "人工知能と自動化エージェントの最適化プラットフォーム",
        proyectos: [
          { id: "proj-cjk", nombre: "クラウド自動化基盤プロジェクト", objetivo: "次世代エージェントの展開" },
        ],
        roadmap: [
          { id: "task-cjk-1", texto: "日本語自然言語処理モデルの統合と評価", prioridad: "alta", hecho: false },
          { id: "task-cjk-2", texto: "韓国語 (한국어) および中国語 (简体中文 / 繁體中文) の多言語対応", prioridad: "media", hecho: true },
        ],
        historial: [
          { fecha: "2026-09-05", texto: "東京支社の開発サーバー稼働開始。全テストが正常終了しました。" },
        ],
        extra: {
          hangul_text: "안녕하세요 세계! 인공지능 에イ전트 운영체제",
          chinese_simplified: "数字化对齐与智能代理系统测试",
          chinese_traditional: "數位化對齊與智慧代理系統測試",
        },
        bodyMarkdown: "<!-- agente: antigravity -->\n\n# 東京デジタル・アライメント 🌸\n\n## 概要\nこれは日本語、韓国語、中国語を含む多言語テストドキュメントです。\n\n- 項目 1: 高速処理\n- 項目 2: 完璧な互換性\n",
      };

      const writeRes = await writeVaultNote("Clientes/Tokyo.md", cjkNote, sandbox.vaultDir);
      assert(writeRes.success, "Write must succeed for CJK note");

      const readBack = await readVaultNote("Clientes/Tokyo.md", sandbox.vaultDir);
      assert(readBack !== null, "Read note must not be null");
      assertEqual(readBack.nombre, cjkNote.nombre, "Nombre must preserve CJK characters exactly");
      assertEqual(readBack.categoria, cjkNote.categoria, "Categoria must preserve CJK characters exactly");
      assertEqual(readBack.proyectos[0].nombre, cjkNote.proyectos[0].nombre, "Proyecto nombre must preserve CJK");
      assertEqual(readBack.roadmap[0].texto, cjkNote.roadmap[0].texto, "Roadmap item 1 texto must preserve CJK");
      assertEqual(readBack.roadmap[1].texto, cjkNote.roadmap[1].texto, "Roadmap item 2 texto must preserve CJK/Hangul");
      assertEqual(readBack.historial[0].texto, cjkNote.historial[0].texto, "Historial texto must preserve CJK");
      assertEqual(readBack.extra.hangul_text, cjkNote.extra.hangul_text, "Hangul extra field must be preserved");
      assertEqual(readBack.extra.chinese_simplified, cjkNote.extra.chinese_simplified, "Chinese simplified extra field preserved");
      assertEqual(readBack.extra.chinese_traditional, cjkNote.extra.chinese_traditional, "Chinese traditional extra field preserved");
      assert(readBack.bodyMarkdown.includes("これは日本語、韓国語、中国語を含む多言語テストドキュメントです。"), "Body CJK preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("1.2 Cyrillic, Greek, RTL (Arabic, Hebrew) and Math Symbols", async () => {
    const sandbox = await createTempVault();
    try {
      const multiScriptNote = {
        id: "multilingual-script-test",
        nombre: "Многоязычный Тест & Ελληνικά 🌐",
        categoria: "Тестирование многоязычной поддержки и RTL",
        extra: {
          cyrillic: "Синхронизация хранилища данных Obsidian без потерь",
          greek: "Σύστημα Διαχείρισης Πρακτόρων και Ευθυγράμμιση",
          arabic: "نظام محاذاة البيانات الرقمية والوكلاء الأذكياء",
          hebrew: "מערכת ניהול משימות וסנכרון נתונים מלא",
          math_symbols: "∀x ∈ ℝ : ∫ f(x)dx ≤ ∑_{i=1}^n λ_i ≈ ∞ ∧ x ≠ ∅",
          special_punctuation: "«guillemets» “curly quotes” ‘single’ – en-dash — em-dash … ellipsis",
          zero_width_chars: "invisible\u200Bzero\u200Cwidth\u200Djoiner",
          non_breaking_space: "word1\u00A0word2\u00A0word3",
        },
        bodyMarkdown: "<!-- agente: antigravity -->\n\n# Global Script Document\n\n- Arabic RTL: مرحبا بالعالم\n- Hebrew RTL: שלום עולם\n- Math: lim_{x→0} sin(x)/x = 1\n",
      };

      const writeRes = await writeVaultNote("Clientes/MultiScript.md", multiScriptNote, sandbox.vaultDir);
      assert(writeRes.success, "Write must succeed for multi-script note");

      const readBack = await readVaultNote("Clientes/MultiScript.md", sandbox.vaultDir);
      assert(readBack !== null, "Read note must not be null");
      assertEqual(readBack.nombre, multiScriptNote.nombre, "Cyrillic & Greek nombre preserved");
      assertEqual(readBack.categoria, multiScriptNote.categoria, "Cyrillic categoria preserved");
      assertEqual(readBack.extra.cyrillic, multiScriptNote.extra.cyrillic, "Cyrillic extra preserved");
      assertEqual(readBack.extra.greek, multiScriptNote.extra.greek, "Greek extra preserved");
      assertEqual(readBack.extra.arabic, multiScriptNote.extra.arabic, "Arabic RTL extra preserved");
      assertEqual(readBack.extra.hebrew, multiScriptNote.extra.hebrew, "Hebrew RTL extra preserved");
      assertEqual(readBack.extra.math_symbols, multiScriptNote.extra.math_symbols, "Math symbols preserved");
      assertEqual(readBack.extra.special_punctuation, multiScriptNote.extra.special_punctuation, "Special punctuation preserved");
      assertEqual(readBack.extra.zero_width_chars, multiScriptNote.extra.zero_width_chars, "Zero-width characters preserved");
      assertEqual(readBack.extra.non_breaking_space, multiScriptNote.extra.non_breaking_space, "NBSP preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  // ====================================================================
  // SUITE 2: SPANISH & PORTUGUESE ACCENTS AND DIACRITICS
  // ====================================================================
  console.log("\n--- SUITE 2: SPANISH ACCENTS & DIACRITICS ---");

  await runTest("2.1 Spanish/Portuguese diacritics in all schema fields (ñ, á, é, í, ó, ú, ü, ¿, ¡, ç, ã, õ)", async () => {
    const sandbox = await createTempVault();
    try {
      const spanishNote = {
        id: "nipei-gestion-operativa",
        nombre: "Nipëi Gestión Operativa — Producción y Logística Internacional",
        tipo: "cliente_externo",
        estado: "activo",
        rubro: "comunidad_cultura",
        categoria: "Diseño, mantención y orquestación de sistemas lingüísticos con automatización",
        proyectos: [
          {
            id: "proj-traduccion",
            nombre: "Módulo de Traducción Español / Português",
            objetivo: "¿Garantizar la precisión semántica con acentos y puntuación invertida?",
            tecnologias: ["TypeScript 5", "Next.js 16", "Lingüística Computacional"],
          },
        ],
        roadmap: [
          {
            id: "tarea-pasarela-rio",
            texto: "¿Cuándo se implementará la pasarela de pagos con débito automático en Río de Janeiro?",
            prioridad: "urgente",
            hecho: false,
            estado: "en_curso",
            responsable: "Martín Cañete",
            tags: ["pagos", "operación", "logística"],
          },
          {
            id: "tarea-auditoria-sao-paulo",
            texto: "Auditoría contable del año 2026: verificación de retenciones en São Paulo y Asunción",
            prioridad: "alta",
            hecho: true,
            responsable: "Inês Peixoto",
            tags: ["auditoría", "contabilidad"],
          },
        ],
        historial: [
          {
            fecha: "2026-09-05",
            texto: "Reunión de coordinación técnica con el equipo de diseño y programación: ¡Éxito rotundo en la integración!",
            tags: ["coordinación", "éxito"],
          },
        ],
        canales_adquisicion: ["Campañas de difusión", "Recomendación boca a boca", "Atención al cliente"],
        vacios_detectados: ["Falta confirmación de presupuestos", "Definición de pólizas de garantía"],
        bodyMarkdown: "<!-- agente: antigravity -->\n\n# Nipëi Gestión Operativa 🌿\n\n¡Bienvenidos al centro de control!\n\nPregunta clave: ¿Está todo listo para la producción en Asunción y Bogotá?\n\n- Detalle técnico: Uso estricto de codificación UTF-8 sin BOM.\n- Verificación: La letra eñe (Ñ / ñ) y las vocales con tilde (á, é, í, ó, ú, Á, É, Í, Ó, Ú) no se corrompen.\n",
      };

      const writeRes = await writeVaultNote("Clientes/NipeiGestion.md", spanishNote, sandbox.vaultDir);
      assert(writeRes.success, "Writing Spanish note must succeed");

      const readBack = await readVaultNote("Clientes/NipeiGestion.md", sandbox.vaultDir);
      assert(readBack !== null, "Read note must not be null");
      assertEqual(readBack.nombre, spanishNote.nombre, "Nombre with accents preserved");
      assertEqual(readBack.categoria, spanishNote.categoria, "Categoria with accents preserved");
      assertEqual(readBack.proyectos[0].objetivo, spanishNote.proyectos[0].objetivo, "Objetivo with ¿ and accents preserved");
      assertEqual(readBack.roadmap[0].texto, spanishNote.roadmap[0].texto, "Roadmap question with ¿, á, é, í, ó preserved");
      assertEqual(readBack.roadmap[0].responsable, "Martín Cañete", "Responsable Martín Cañete preserved");
      assertEqual(readBack.roadmap[1].responsable, "Inês Peixoto", "Responsable Inês Peixoto with circumflex preserved");
      assertEqual(readBack.historial[0].texto, spanishNote.historial[0].texto, "Historial with ¡ and accents preserved");
      assertEqual(readBack.canales_adquisicion[0], "Campañas de difusión", "Canales with ñ and ó preserved");
      assertEqual(readBack.vacios_detectados[1], "Definición de pólizas de garantía", "Vacios with ó and í preserved");
      assert(readBack.bodyMarkdown.includes("¿Está todo listo para la producción en Asunción y Bogotá?"), "Body Spanish question preserved");
      assert(readBack.bodyMarkdown.includes("La letra eñe (Ñ / ñ) y las vocales con tilde (á, é, í, ó, ú, Á, É, Í, Ó, Ú)"), "Body Spanish alphabet test preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("2.2 Multiple consecutive roundtrips of Spanish text without character mutation", async () => {
    const sandbox = await createTempVault();
    try {
      const initial = {
        id: "roundtrip-accents",
        nombre: "Compañía de Energía & Comunicación Líquida",
        categoria: "Solución de optimización de código e infraestructura ágil",
        roadmap: [
          { id: "task-1", texto: "¿Habrá algún problema tras diez iteraciones de guardado?", hecho: false },
        ],
      };

      await writeVaultNote("Clientes/Roundtrip.md", initial, sandbox.vaultDir);

      // Perform 10 consecutive read-modify-write roundtrips
      for (let i = 1; i <= 10; i++) {
        const current = await readVaultNote("Clientes/Roundtrip.md", sandbox.vaultDir);
        assert(current !== null, `Iteration ${i} read must succeed`);
        assertEqual(current.nombre, initial.nombre, `Nombre must not degrade on iteration ${i}`);
        assertEqual(current.categoria, initial.categoria, `Categoria must not degrade on iteration ${i}`);
        assertEqual(current.roadmap[0].texto, initial.roadmap[0].texto, `Roadmap texto must not degrade on iteration ${i}`);

        // Modify a field and save back
        await writeVaultNote("Clientes/Roundtrip.md", {
          extra: { iteration: i, timestamp: new Date().toISOString() },
        }, sandbox.vaultDir);
      }

      const finalNote = await readVaultNote("Clientes/Roundtrip.md", sandbox.vaultDir);
      assertEqual(finalNote.nombre, initial.nombre, "Final nombre after 10 roundtrips must match exactly");
      assertEqual(finalNote.categoria, initial.categoria, "Final categoria after 10 roundtrips must match exactly");
      assertEqual(finalNote.extra.iteration, 10, "Final iteration count must be 10");
    } finally {
      await sandbox.cleanup();
    }
  });

  // ====================================================================
  // SUITE 3: EMOJIS & COMPLEX UNICODE SEQUENCES
  // ====================================================================
  console.log("\n--- SUITE 3: EMOJIS & COMPLEX UNICODE SEQUENCES ---");

  await runTest("3.1 Standard, Astral Plane, ZWJ sequences, Skin Tones, and Flags", async () => {
    const sandbox = await createTempVault();
    try {
      const emojiNote = {
        id: "emoji-matrix-test",
        nombre: "Digital Alignment 🚀 Matrix 🌿",
        emoji: "🌿",
        categoria: "Plataforma de agentes 🤖 con superpoderes ⚡",
        extra: {
          standard_emojis: "🌿 🚀 💡 ⚡ 📦 🎯 🛠️ ✨ 🔥 💎",
          astral_plane_4byte: "🪐 🦄 🧠 🛸 👾 🧬 🥑 🪐 🪂",
          zwj_technologist: "👩‍💻 👨‍💻 🧑‍🔬 👩‍🚀",
          zwj_family: "👨‍👩‍👧‍👦",
          skin_tones: "👍🏻 👍🏼 👍🏽 👍🏾 👍🏿 🧑🏽‍💻",
          flags: "🇦🇷 🇧🇷 🇺🇾 🇨🇱 🇪🇸 🇯🇵 🇺🇸 🇬🇧 🇩🇪 🇫🇷",
          keycaps: "1️⃣ 2️⃣ 3️⃣ #️⃣ *️⃣",
          mixed_text: "Nipëi 🌿 es 100% compatible con 🚀 Claude Code 🤖!",
        },
        roadmap: [
          {
            id: "task-emoji-1",
            texto: "Implementar soporte para 👩‍💻 desarrolladores y 🤖 agentes inteligentes",
            prioridad: "urgente",
            tags: ["ai-🤖", "rocket-🚀"],
            hecho: false,
          },
          {
            id: "task-emoji-2",
            texto: "Despliegue regional en 🇦🇷 Argentina y 🇧🇷 Brasil completado ✨",
            prioridad: "alta",
            hecho: true,
          },
        ],
        bodyMarkdown: "<!-- agente: antigravity -->\n\n# Digital Alignment 🚀 Matrix 🌿\n\n- Estado del sistema: 🟢 Operativo\n- Rendimiento: ⚡ Ultra rápido\n- Agentes activos: 🤖 Claude, 🪽 Hermes, 🦞 OpenClaw\n- Banderas: 🇦🇷 🇧🇷\n",
      };

      const writeRes = await writeVaultNote("Clientes/EmojiMatrix.md", emojiNote, sandbox.vaultDir);
      assert(writeRes.success, "Write must succeed for emoji note");

      const readBack = await readVaultNote("Clientes/EmojiMatrix.md", sandbox.vaultDir);
      assert(readBack !== null, "Read note must not be null");
      assertEqual(readBack.emoji, "🌿", "Emoji field preserved");
      assertEqual(readBack.nombre, emojiNote.nombre, "Nombre with emojis preserved");
      assertEqual(readBack.categoria, emojiNote.categoria, "Categoria with emojis preserved");
      assertEqual(readBack.extra.standard_emojis, emojiNote.extra.standard_emojis, "Standard emojis preserved");
      assertEqual(readBack.extra.astral_plane_4byte, emojiNote.extra.astral_plane_4byte, "Astral plane 4-byte emojis preserved");
      assertEqual(readBack.extra.zwj_technologist, emojiNote.extra.zwj_technologist, "ZWJ technologist sequence preserved");
      assertEqual(readBack.extra.zwj_family, emojiNote.extra.zwj_family, "ZWJ family sequence preserved");
      assertEqual(readBack.extra.skin_tones, emojiNote.extra.skin_tones, "Skin tone modifiers preserved");
      assertEqual(readBack.extra.flags, emojiNote.extra.flags, "Flag regional indicator sequences preserved");
      assertEqual(readBack.extra.keycaps, emojiNote.extra.keycaps, "Keycap sequences preserved");
      assertEqual(readBack.extra.mixed_text, emojiNote.extra.mixed_text, "Mixed text with emojis preserved");
      assertEqual(readBack.roadmap[0].texto, emojiNote.roadmap[0].texto, "Roadmap 1 emoji text preserved");
      assertEqual(readBack.roadmap[1].texto, emojiNote.roadmap[1].texto, "Roadmap 2 emoji text preserved");
      assert(readBack.bodyMarkdown.includes("🤖 Claude, 🪽 Hermes, 🦞 OpenClaw"), "Body markdown emojis preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  // ====================================================================
  // SUITE 4: FOLDED FRONTMATTER & YAML MULTI-LINE SCALARS
  // ====================================================================
  console.log("\n--- SUITE 4: FOLDED FRONTMATTER & YAML MULTI-LINE SCALARS ---");

  await runTest("4.1 Literal style (|) and folded style (>) multi-line YAML frontmatter blocks", async () => {
    const sandbox = await createTempVault();
    try {
      const rawContent = `---
id: folded-scalars-brand
nombre: Folded Scalars Test Brand
categoria: >
  This is a long description that has been folded
  using the YAML greater-than symbol across multiple lines
  for readability in Obsidian editor.
literal_block: |
  Line 1 of literal block
  Line 2 of literal block
  Line 3: colons: and quotes " ' are preserved
folded_block: >
  Another folded block that joins lines
  with single spaces unless empty line is present.
roadmap:
  - id: folded-task-1
    texto: >
      Detailed roadmap specification that spans
      over multiple physical lines in the source YAML note.
    prioridad: alta
    hecho: false
---
<!-- agente: antigravity -->

# Body Content Here
This is normal body text following folded frontmatter.
`;

      const notePath = path.join(sandbox.clientesDir, "FoldedScalars.md");
      await fs.promises.writeFile(notePath, rawContent, "utf8");

      const parsed = await readVaultNote("Clientes/FoldedScalars.md", sandbox.vaultDir);
      assert(parsed !== null, "Folded scalars note must parse successfully");
      assertEqual(parsed.id, "folded-scalars-brand", "ID parsed");
      assertEqual(parsed.nombre, "Folded Scalars Test Brand", "Nombre parsed");
      assert(parsed.categoria.includes("This is a long description that has been folded"), "Folded categoria loaded as single string");
      assert(typeof parsed.extra.literal_block === "string", "Literal block loaded as string into extra");
      assert(parsed.extra.literal_block.includes("Line 1 of literal block\nLine 2"), "Literal block preserved internal newlines");
      assert(parsed.roadmap[0].texto.includes("Detailed roadmap specification"), "Folded roadmap texto loaded cleanly");
      assert(parsed.bodyMarkdown.includes("This is normal body text following folded frontmatter."), "Body markdown intact");

      // Verify write back preserves values
      const writeRes = await writeVaultNote("Clientes/FoldedScalars.md", {
        extra: { ...parsed.extra, updated_key: "verified" },
      }, sandbox.vaultDir);
      assert(writeRes.success, "Write back of note with folded scalars must succeed");

      const reRead = await readVaultNote("Clientes/FoldedScalars.md", sandbox.vaultDir);
      assert(reRead !== null, "Re-read note must not be null");
      assertEqual(reRead.extra.updated_key, "verified", "Updated key present");
      assert(reRead.categoria.includes("This is a long description that has been folded"), "Folded categoria preserved on write-back");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("4.2 YAML with special characters, colons in values, quotes, and brackets", async () => {
    const sandbox = await createTempVault();
    try {
      const specialNote = {
        id: "special-yaml-chars",
        nombre: "Brand with: Colons, Quotes \"Double\" & 'Single'",
        categoria: "Key-value looks like: [a, b, c] and {foo: bar} and #comment?",
        roadmap: [
          {
            id: "task-special-1",
            texto: "Task text with : colons, @mentions, #hashtags, [markdown link](https://da.org), and \"quotes\"",
            prioridad: "media",
            tags: ["tag:with:colons", "tag-normal"],
            hecho: false,
          },
        ],
        extra: {
          colon_key: "value:with:colons",
          json_string: '{"nested": "json", "count": 42}',
          yaml_reserved_chars: "- ? : , [ ] { } # & * ! | > ' \" % @ `",
        },
      };

      const writeRes = await writeVaultNote("Clientes/SpecialChars.md", specialNote, sandbox.vaultDir);
      assert(writeRes.success, "Write special chars note must succeed");

      const readBack = await readVaultNote("Clientes/SpecialChars.md", sandbox.vaultDir);
      assert(readBack !== null, "Read back must succeed");
      assertEqual(readBack.nombre, specialNote.nombre, "Nombre with colons and quotes preserved");
      assertEqual(readBack.categoria, specialNote.categoria, "Categoria with brackets/colons preserved");
      assertEqual(readBack.roadmap[0].texto, specialNote.roadmap[0].texto, "Roadmap with colons/links preserved");
      assertEqual(readBack.extra.colon_key, specialNote.extra.colon_key, "Colon key preserved");
      assertEqual(readBack.extra.json_string, specialNote.extra.json_string, "JSON string preserved");
      assertEqual(readBack.extra.yaml_reserved_chars, specialNote.extra.yaml_reserved_chars, "Reserved chars preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("4.3 CRLF Windows line endings preservation across frontmatter and body", async () => {
    const sandbox = await createTempVault();
    try {
      const crlfNoteContent = "---\r\nid: crlf-test\r\nnombre: CRLF Windows Brand\r\nestado: activo\r\n---\r\n<!-- agente: antigravity -->\r\n\r\n# Line 1\r\n\r\nLine 2 CRLF content.\r\n";
      await fs.promises.writeFile(path.join(sandbox.clientesDir, "CRLF.md"), crlfNoteContent, "utf8");

      const parsed = await readVaultNote("Clientes/CRLF.md", sandbox.vaultDir);
      assert(parsed !== null, "CRLF note must parse cleanly");
      assertEqual(parsed.id, "crlf-test", "ID correctly parsed with CRLF");
      assertEqual(parsed.nombre, "CRLF Windows Brand", "Nombre correctly parsed with CRLF");
      assert(parsed.bodyMarkdown.includes("Line 2 CRLF content."), "Body preserved with CRLF");

      // Write back and verify it remains readable
      await writeVaultNote("Clientes/CRLF.md", { categoria: "Updated via CRLF test" }, sandbox.vaultDir);
      const reRead = await readVaultNote("Clientes/CRLF.md", sandbox.vaultDir);
      assertEqual(reRead.categoria, "Updated via CRLF test", "Categoria updated");
      assert(reRead.bodyMarkdown.includes("Line 2 CRLF content."), "Body preserved after write");
    } finally {
      await sandbox.cleanup();
    }
  });

  // ====================================================================
  // SUITE 5: MISSING MANDATORY KEYS & MALFORMED FRONTMATTER
  // ====================================================================
  console.log("\n--- SUITE 5: MISSING MANDATORY KEYS & SILENT DEGRADATION ---");

  await runTest("5.1 Missing id key, missing nombre key, or both missing", async () => {
    const sandbox = await createTempVault();
    try {
      // Note 1: Missing id
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "MissingId.md"),
        `---\nnombre: Missing ID Note\n---\nBody\n`,
        "utf8"
      );
      // Note 2: Missing nombre
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "MissingNombre.md"),
        `---\nid: missing-nombre\n---\nBody\n`,
        "utf8"
      );
      // Note 3: Neither id nor nombre
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "MissingBoth.md"),
        `---\ncategoria: Only Categoria\nestado: activo\n---\nBody\n`,
        "utf8"
      );

      assertEqual(await readVaultNote("Clientes/MissingId.md", sandbox.vaultDir), null, "Note missing id must return null");
      assertEqual(await readVaultNote("Clientes/MissingNombre.md", sandbox.vaultDir), null, "Note missing nombre must return null");
      assertEqual(await readVaultNote("Clientes/MissingBoth.md", sandbox.vaultDir), null, "Note missing both must return null");

      const all = await parseAllClients(sandbox.vaultDir);
      assertEqual(all.length, 0, "parseAllClients must omit all notes missing mandatory keys");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("5.2 Empty string or whitespace-only mandatory keys ('', '   ')", async () => {
    const sandbox = await createTempVault();
    try {
      // Empty string id
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "EmptyId.md"),
        `---\nid: ""\nnombre: Valid Name\n---\nBody\n`,
        "utf8"
      );
      // Whitespace id
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "WhitespaceId.md"),
        `---\nid: "   "\nnombre: Valid Name\n---\nBody\n`,
        "utf8"
      );
      // Empty string nombre
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "EmptyNombre.md"),
        `---\nid: valid-id\nnombre: ""\n---\nBody\n`,
        "utf8"
      );
      // Whitespace nombre
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "WhitespaceNombre.md"),
        `---\nid: valid-id\nnombre: "   "\n---\nBody\n`,
        "utf8"
      );

      assertEqual(await readVaultNote("Clientes/EmptyId.md", sandbox.vaultDir), null, "Empty id must return null");
      assertEqual(await readVaultNote("Clientes/WhitespaceId.md", sandbox.vaultDir), null, "Whitespace id must return null");
      assertEqual(await readVaultNote("Clientes/EmptyNombre.md", sandbox.vaultDir), null, "Empty nombre must return null");
      assertEqual(await readVaultNote("Clientes/WhitespaceNombre.md", sandbox.vaultDir), null, "Whitespace nombre must return null");

      const all = await parseAllClients(sandbox.vaultDir);
      assertEqual(all.length, 0, "parseAllClients must omit notes with empty or whitespace mandatory keys");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("5.3 Malformed YAML syntax, tab indentation errors, unclosed strings", async () => {
    const sandbox = await createTempVault();
    try {
      // Tab character error in YAML
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "TabError.md"),
        `---\nid: tab-error\nnombre: Tab Error\nroadmap:\n\t- id: item\n---\nBody\n`,
        "utf8"
      );
      // Unclosed quote in YAML
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "UnclosedQuote.md"),
        `---\nid: unclosed-quote\nnombre: "Unclosed string\n---\nBody\n`,
        "utf8"
      );
      // Zero-byte empty file
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "ZeroBytes.md"),
        ``,
        "utf8"
      );
      // Markdown-only note without frontmatter delimiter
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "NoFrontmatter.md"),
        `# Just Markdown\nNo frontmatter delimiters here.\n`,
        "utf8"
      );

      assertEqual(await readVaultNote("Clientes/TabError.md", sandbox.vaultDir), null, "Tab error note must degrade gracefully to null");
      assertEqual(await readVaultNote("Clientes/UnclosedQuote.md", sandbox.vaultDir), null, "Unclosed quote note must degrade gracefully to null");
      assertEqual(await readVaultNote("Clientes/ZeroBytes.md", sandbox.vaultDir), null, "Zero bytes note must degrade gracefully to null");
      assertEqual(await readVaultNote("Clientes/NoFrontmatter.md", sandbox.vaultDir), null, "No frontmatter note must degrade gracefully to null");

      const all = await parseAllClients(sandbox.vaultDir);
      assertEqual(all.length, 0, "parseAllClients must degrade gracefully on malformed notes");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("5.4 Reserved support notes starting with '_' are excluded by parseAllClients", async () => {
    const sandbox = await createTempVault();
    try {
      // Valid frontmatter in _Ecosistema.md and _Infraestructura.md
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "_Ecosistema.md"),
        `---\nid: ecosistema\nnombre: Ecosistema Digital Alignment\n---\nSupport note\n`,
        "utf8"
      );
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "_Infraestructura.md"),
        `---\nid: infra\nnombre: Infraestructura Compartida\n---\nSupport note\n`,
        "utf8"
      );
      // Legitimate brand note
      await fs.promises.writeFile(
        path.join(sandbox.clientesDir, "ValidBrand.md"),
        `---\nid: valid-brand\nnombre: Valid Brand\n---\nBrand note\n`,
        "utf8"
      );

      const all = await parseAllClients(sandbox.vaultDir);
      assertEqual(all.length, 1, "parseAllClients must return exactly 1 brand");
      assertEqual(all[0].id, "valid-brand", "Only legitimate non-underscore brand note returned");
    } finally {
      await sandbox.cleanup();
    }
  });

  // ====================================================================
  // SUITE 6: ATOMIC WRITE RECOVERY & ROBUSTNESS
  // ====================================================================
  console.log("\n--- SUITE 6: ATOMIC WRITE RECOVERY & ROBUSTNESS ---");

  await runTest("6.1 Automatic creation of missing parent directory on write", async () => {
    const sandbox = await createTempVault();
    try {
      // Path in a nested, non-existent folder
      const writeRes = await writeVaultNote("DeepFolder/Nested/NewBrand.md", {
        id: "nested-brand",
        nombre: "Nested Brand",
        categoria: "Testing deep recursive directory creation",
      }, sandbox.vaultDir);

      assert(writeRes.success, "writeVaultNote must succeed and create directories recursively");
      const readBack = await readVaultNote("DeepFolder/Nested/NewBrand.md", sandbox.vaultDir);
      assert(readBack !== null, "Nested note must be readable");
      assertEqual(readBack.id, "nested-brand", "Nested note ID matches");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("6.2 No orphaned .tmp files remain after successful or failed write operations", async () => {
    const sandbox = await createTempVault();
    try {
      const notePath = path.join(sandbox.clientesDir, "CleanupTest.md");
      await writeVaultNote("Clientes/CleanupTest.md", {
        id: "cleanup-test",
        nombre: "Cleanup Test Brand",
      }, sandbox.vaultDir);

      // Inspect directory for any .tmp files
      const files = await fs.promises.readdir(sandbox.clientesDir);
      const tmpFiles = files.filter((f) => f.endsWith(".tmp"));
      assertEqual(tmpFiles.length, 0, "No .tmp files should exist after successful write");

      // Verify .bak file was created if target already existed
      await writeVaultNote("Clientes/CleanupTest.md", {
        categoria: "Updated categoria for backup test",
      }, sandbox.vaultDir);

      const filesAfterSecondWrite = await fs.promises.readdir(sandbox.clientesDir);
      const tmpFiles2 = filesAfterSecondWrite.filter((f) => f.endsWith(".tmp"));
      assertEqual(tmpFiles2.length, 0, "No .tmp files should exist after second write");

      const hasBak = filesAfterSecondWrite.some((f) => f.endsWith(".bak"));
      assert(hasBak, "Backup file .bak should exist after overwriting an existing note");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("6.3 Backup file (.bak) preserves previous note state", async () => {
    const sandbox = await createTempVault();
    try {
      const initial = {
        id: "backup-preserve-test",
        nombre: "Initial State Brand",
        categoria: "Initial Categoria V1",
      };
      await writeVaultNote("Clientes/BackupTest.md", initial, sandbox.vaultDir);

      const targetPath = path.join(sandbox.clientesDir, "BackupTest.md");
      const bakPath = `${targetPath}.bak`;

      // Overwrite with V2
      await writeVaultNote("Clientes/BackupTest.md", {
        categoria: "Updated Categoria V2",
      }, sandbox.vaultDir);

      assert(fs.existsSync(bakPath), ".bak file must exist");
      const bakContent = await fs.promises.readFile(bakPath, "utf8");
      assert(bakContent.includes("Initial Categoria V1"), "Backup file must contain previous state (V1)");

      const liveContent = await fs.promises.readFile(targetPath, "utf8");
      assert(liveContent.includes("Updated Categoria V2"), "Target file must contain updated state (V2)");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("6.4 Body watermark guarantees: <!-- agente: antigravity --> on line 1", async () => {
    const sandbox = await createTempVault();
    try {
      // Case A: No body provided (brand new note)
      await writeVaultNote("Clientes/WatermarkA.md", {
        id: "watermark-a",
        nombre: "Watermark A",
      }, sandbox.vaultDir);

      const readA = await readVaultNote("Clientes/WatermarkA.md", sandbox.vaultDir);
      assert(readA.bodyMarkdown.trim().startsWith("<!-- agente: antigravity -->"), "Case A: Must start with antigravity watermark");

      // Case B: User provided custom body without watermark
      await writeVaultNote("Clientes/WatermarkB.md", {
        id: "watermark-b",
        nombre: "Watermark B",
        bodyMarkdown: "# Custom Notes\nSome body text.\n",
      }, sandbox.vaultDir);

      const readB = await readVaultNote("Clientes/WatermarkB.md", sandbox.vaultDir);
      assert(readB.bodyMarkdown.trim().startsWith("<!-- agente: antigravity -->"), "Case B: Must prepend antigravity watermark");
      assert(readB.bodyMarkdown.includes("# Custom Notes"), "Case B: Preserved custom body content");

      // Case C: User provided body already containing claude-code watermark
      await writeVaultNote("Clientes/WatermarkC.md", {
        id: "watermark-c",
        nombre: "Watermark C",
        bodyMarkdown: "<!-- agente: claude-code -->\n\n# Existing Claude Note\n",
      }, sandbox.vaultDir);

      const readC = await readVaultNote("Clientes/WatermarkC.md", sandbox.vaultDir);
      assert(readC.bodyMarkdown.trim().startsWith("<!-- agente: claude-code -->"), "Case C: Existing claude-code watermark preserved without duplication");
    } finally {
      await sandbox.cleanup();
    }
  });

  await runTest("6.5 Security check: Credential sanitization strips plaintext secrets", async () => {
    const sandbox = await createTempVault();
    try {
      const sensitiveNote = {
        id: "security-service-test",
        nombre: "Security Service Test",
        servicios: [
          {
            id: "svc-wp",
            tipo: "wordpress",
            nombre: "WordPress Admin",
            url: "https://wp.example.com",
            usuario: "admin",
            credencial_ref: "secret-vault-wp-ref",
            password: "PLAINTEXT_LEAKED_PASSWORD",
            api_key: "SK-SUPER-SECRET-KEY-12345",
            token: "TOKEN-BEARER-XYZ",
            contraseña: "CLAVE_SECRETA",
          },
        ],
      };

      await writeVaultNote("Clientes/SecurityTest.md", sensitiveNote, sandbox.vaultDir);

      const targetPath = path.join(sandbox.clientesDir, "SecurityTest.md");
      const rawDiskContent = await fs.promises.readFile(targetPath, "utf8");

      assert(!rawDiskContent.includes("PLAINTEXT_LEAKED_PASSWORD"), "Password must never be written to disk");
      assert(!rawDiskContent.includes("SK-SUPER-SECRET-KEY-12345"), "API key must never be written to disk");
      assert(!rawDiskContent.includes("TOKEN-BEARER-XYZ"), "Token must never be written to disk");
      assert(!rawDiskContent.includes("CLAVE_SECRETA"), "Contraseña must never be written to disk");
      assert(rawDiskContent.includes("secret-vault-wp-ref"), "Safe credencial_ref must be preserved");

      const readBack = await readVaultNote("Clientes/SecurityTest.md", sandbox.vaultDir);
      assertEqual(readBack.servicios[0].credencial_ref, "secret-vault-wp-ref", "Credencial ref accessible");
      assertEqual(readBack.servicios[0].password, undefined, "Password stripped from memory model");
    } finally {
      await sandbox.cleanup();
    }
  });

  console.log("\n======================================================================");
  console.log("                        EXECUTION RESULTS                             ");
  console.log("======================================================================");
  console.log(`Total Stress Tests: ${totalTests}`);
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
  console.error("Fatal error in stress suite:", err);
  process.exit(1);
});
