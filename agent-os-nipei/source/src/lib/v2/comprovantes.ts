import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { alterarLancamento, getLancamentos } from "./data";
import { agora } from "@/lib/tarefaNote";
import { eHeic } from "./perfil";

// Receipt of a lançamento (DS 10.25): one file per entry in Financeiro/Comprovantes/<id>.<ext>.
// Photos become a ≤2000 px JPEG without EXIF (no GPS); PDFs are kept as they are.
const DIR = path.join("Financeiro", "Comprovantes");
export const COMPROVANTE_TIPOS: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const MAX = 10 * 1024 * 1024;

const ehPdf = (b: Buffer) => b.toString("latin1", 0, 5) === "%PDF-";

export async function salvarComprovante(id: string, bytes: Buffer, quem: string) {
  const l = getLancamentos().find((x) => x.id === id);
  if (!l) throw new Error("Lançamento não encontrado");
  if (bytes.length > MAX) throw new Error("Máximo 10 MB");
  let ext = "pdf", dados = bytes;
  if (!ehPdf(bytes)) {
    // the bytes decide, not the browser's type: anything that is not a PDF must be an image sharp (or heic-convert) can read
    try {
      let entrada = bytes;
      if (eHeic(bytes)) {
        const { default: converter } = await import("heic-convert");
        entrada = Buffer.from(await converter({ buffer: bytes, format: "JPEG", quality: 0.92 }));
      }
      const { default: sharp } = await import("sharp");
      dados = await sharp(entrada).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      ext = "jpg";
    } catch {
      throw new Error("Use PDF, JPG, PNG, WebP ou HEIC.");
    }
  }
  const dir = path.join(defaultVault()!, DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.startsWith(`${id}.`)) fs.unlinkSync(path.join(dir, f));
  fs.writeFileSync(path.join(dir, `${id}.${ext}`), dados);
  alterarLancamento(l, { comprovante: `Financeiro/Comprovantes/${id}.${ext}` }, quem, [l.comprovante ? "Trocou o comprovante" : "Anexou o comprovante"]);
}

// ---- receipt sent by WhatsApp before the entry exists: waits 2 h in <vault>/.jobs/whatsapp-recibos/<pessoa>.json
// and is attached to the next entry the person confirms by WhatsApp (or by the card in the app).
const PEND_MS = 2 * 60 * 60_000;
const arqPend = (pessoa: string) => path.join(defaultVault()!, ".jobs", "whatsapp-recibos", `${pessoa.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

export function guardarReciboPendente(pessoa: string, base64: string, mime: string) {
  fs.mkdirSync(path.dirname(arqPend(pessoa)), { recursive: true });
  fs.writeFileSync(arqPend(pessoa), JSON.stringify({ em: new Date().toISOString(), base64, mime }));
}

function lerPend(pessoa: string): { base64: string } | null {
  try { const o = JSON.parse(fs.readFileSync(arqPend(pessoa), "utf-8")); return Date.now() - Date.parse(o.em) < PEND_MS ? o : null; } catch { return null; }
}
export const temReciboPendente = (pessoa: string) => !!lerPend(pessoa);

/** Attaches the waiting receipt (if any) to the entry; true when it did. */
export async function usarReciboPendente(pessoa: string, lancId: string, quem: string) {
  const o = lerPend(pessoa);
  fs.rmSync(arqPend(pessoa), { force: true });
  if (!o) return false;
  await salvarComprovante(lancId, Buffer.from(o.base64, "base64"), quem);
  return true;
}

/** The person's latest entry of the last 2 h still without a receipt ("recibo" alone, sent after the entry). */
export function ultimoSemComprovante(pessoa: string) {
  const desde = agora(new Date(Date.now() - PEND_MS));
  return getLancamentos().filter((l) => l.registradoPor === pessoa && !l.anulado && !l.comprovante && l.registradoEm >= desde)
    .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))[0];
}

export function arquivoComprovante(id: string): { abs: string; tipo: string } | null {
  const l = getLancamentos().find((x) => x.id === id);
  if (!l?.comprovante) return null;
  const abs = path.resolve(defaultVault()!, l.comprovante);
  const ext = abs.split(".").pop() ?? "";
  // only files of the receipts folder (the note could be edited by hand in Obsidian)
  if (!abs.startsWith(path.resolve(defaultVault()!, DIR) + path.sep) || !COMPROVANTE_TIPOS[ext] || !fs.existsSync(abs)) return null;
  return { abs, tipo: COMPROVANTE_TIPOS[ext] };
}
