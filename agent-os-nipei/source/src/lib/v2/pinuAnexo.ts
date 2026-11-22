// A photo or file attached in the Pinu panel (DS 10.11). The model sees it in that answer (image, PDF or text, the
// same parts the Conhecimento reader uses); a proposal can then use the original: guardar_conhecimento with
// anexo → the file becomes a source; registrar_lancamento → the receipt waits for the entry (comprovantes.ts).
// One slot per person in <vault>/.jobs/assistente/anexos/ (out of git), replaced by the next attachment, 24 h.
// ponytail: one attachment per message and per person; several at once if people ask for it.

import fs from "fs";
import path from "path";
import { defaultVault } from "../config";
import { FONTE_TIPOS } from "./conhecimento";
import type { Parte } from "./ia";

export const MAX_ANEXO = 10 * 1024 * 1024;
const VALIDADE = 24 * 60 * 60_000;
const pasta = () => path.join(defaultVault()!, ".jobs", "assistente", "anexos");
const base = (pessoa: string) => path.join(pasta(), pessoa.replace(/[^a-zA-Z0-9_-]/g, "_"));

export type Anexo = { nome: string; ext: string; mime: string; em: string };

/** The bytes decide, not the browser's type: a PDF must start with %PDF, images with their signature. Pure. */
export function tipoDoArquivo(nome: string, bytes: Buffer): { ext: string; mime: string } | null {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const mime = FONTE_TIPOS[ext];
  if (!mime) return null;
  const ini = bytes.subarray(0, 12);
  const ok = ext === "pdf" ? ini.toString("latin1", 0, 4) === "%PDF"
    : ext === "png" ? ini[0] === 0x89 && ini.toString("latin1", 1, 4) === "PNG"
    : ext === "jpg" || ext === "jpeg" ? ini[0] === 0xff && ini[1] === 0xd8
    : ext === "webp" ? ini.toString("latin1", 0, 4) === "RIFF" && ini.toString("latin1", 8, 12) === "WEBP"
    : !bytes.subarray(0, 4096).includes(0); // txt/md/csv: no NUL bytes
  return ok ? { ext: ext === "jpeg" ? "jpg" : ext, mime } : null;
}

export function salvarAnexo(pessoa: string, nome: string, bytes: Buffer): Anexo {
  if (!bytes.length) throw new Error("Arquivo vazio");
  if (bytes.length > MAX_ANEXO) throw new Error("Arquivo grande demais (máx. 10 MB)");
  const t = tipoDoArquivo(nome, bytes);
  if (!t) throw new Error("Formato não aceito: envie foto (JPG, PNG, WebP), PDF ou texto (TXT, MD, CSV)");
  fs.mkdirSync(pasta(), { recursive: true });
  for (const f of fs.readdirSync(pasta())) if (f.startsWith(`${path.basename(base(pessoa))}.`)) fs.rmSync(path.join(pasta(), f), { force: true });
  const a: Anexo = { nome: path.basename(nome).slice(0, 120), ...t, em: new Date().toISOString() };
  fs.writeFileSync(`${base(pessoa)}.${t.ext}`, bytes);
  fs.writeFileSync(`${base(pessoa)}.json`, JSON.stringify(a));
  return a;
}

export function getAnexo(pessoa: string): (Anexo & { bytes: Buffer }) | null {
  try {
    const a = JSON.parse(fs.readFileSync(`${base(pessoa)}.json`, "utf-8")) as Anexo;
    if (Date.now() - Date.parse(a.em) > VALIDADE) return null;
    return { ...a, bytes: fs.readFileSync(`${base(pessoa)}.${a.ext}`) };
  } catch { return null; }
}

/** The attachment as the model reads it (same shapes as the Conhecimento reader). Pure. */
export function parteDoAnexo(a: Anexo & { bytes: Buffer }): Parte {
  if (a.mime === "application/pdf") return { type: "file", file: { filename: a.nome, file_data: `data:application/pdf;base64,${a.bytes.toString("base64")}` } };
  if (a.mime.startsWith("image/")) return { type: "image_url", image_url: { url: `data:${a.mime};base64,${a.bytes.toString("base64")}` } };
  return { type: "text", text: `[conteúdo de ${a.nome}]\n${a.bytes.toString("utf-8").slice(0, 100_000)}` };
}

// self-check: npx tsx src/lib/v2/pinuAnexo.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/pinuAnexo.ts")) {
  const pdf = Buffer.from("%PDF-1.4 x"), png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const casos: [string, Buffer, string | null][] = [["a.pdf", pdf, "pdf"], ["b.PNG", png, "png"], ["c.jpeg", jpg, "jpg"], ["d.txt", Buffer.from("olá"), "txt"],
    ["e.pdf", png, null], ["f.exe", pdf, null], ["g.txt", Buffer.from([0x61, 0, 0x62]), null], ["h.heic", jpg, null]];
  for (const [n, b, ext] of casos) if ((tipoDoArquivo(n, b)?.ext ?? null) !== ext) throw new Error(`${n}: ${tipoDoArquivo(n, b)?.ext}`);
  if (parteDoAnexo({ nome: "x.pdf", ext: "pdf", mime: "application/pdf", em: "", bytes: pdf }).type !== "file") throw new Error("parte pdf");
  console.log("pinuAnexo: ok");
}
