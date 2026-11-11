import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { alterarLancamento, getLancamentos } from "./data";
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

export function arquivoComprovante(id: string): { abs: string; tipo: string } | null {
  const l = getLancamentos().find((x) => x.id === id);
  if (!l?.comprovante) return null;
  const abs = path.resolve(defaultVault()!, l.comprovante);
  const ext = abs.split(".").pop() ?? "";
  // only files of the receipts folder (the note could be edited by hand in Obsidian)
  if (!abs.startsWith(path.resolve(defaultVault()!, DIR) + path.sep) || !COMPROVANTE_TIPOS[ext] || !fs.existsSync(abs)) return null;
  return { abs, tipo: COMPROVANTE_TIPOS[ext] };
}
