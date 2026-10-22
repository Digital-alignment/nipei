import fs from "fs";
import path from "path";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { vault } from "./data";

// Each person's external connections (Google today), one encrypted file per person in
// <vault>/.jobs/conexoes/<pessoa>.json — outside git, never sent to the browser or to any AI.
// AES-256-GCM; the key is NIPEI_CONEXOES_KEY (base64, 32 bytes) or, if unset, derived from
// NIPEI_AUTH_SECRET (rotating that secret then means everyone reconnects).

export type ConexaoGoogle = {
  email: string; refreshToken: string; accessToken?: string; expiraEm?: number; escopos: string[]; conectadoEm: string;
  backup?: { pastaId?: string; arquivos?: Record<string, string>; ultimoEm?: string; erro?: string };
};
export type Conexoes = { google?: ConexaoGoogle };

function chave() {
  const k = process.env.NIPEI_CONEXOES_KEY;
  if (k) return Buffer.from(k, "base64");
  const s = process.env.NIPEI_AUTH_SECRET;
  if (!s) throw new Error("NIPEI_AUTH_SECRET is not set");
  return createHash("sha256").update(`nipei-conexoes:${s}`).digest();
}
const arq = (pessoaId: string) => path.join(vault(), ".jobs", "conexoes", `${pessoaId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

export function cifrar(texto: string) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf-8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}
export function decifrar(s: string) {
  const [iv, tag, dados] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf-8");
}

export function getConexoes(pessoaId: string): Conexoes {
  try { return JSON.parse(decifrar(fs.readFileSync(arq(pessoaId), "utf-8"))); } catch { return {}; }
}
export function salvarConexoes(pessoaId: string, c: Conexoes) {
  fs.mkdirSync(path.dirname(arq(pessoaId)), { recursive: true });
  fs.writeFileSync(arq(pessoaId), cifrar(JSON.stringify(c)), { encoding: "utf-8", mode: 0o600 });
}
/** Everyone with a connection (the nightly backup walks this). */
export function pessoasConectadas(): string[] {
  const dir = path.join(vault(), ".jobs", "conexoes");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
}

