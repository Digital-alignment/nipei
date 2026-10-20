import fs from "fs";
import path from "path";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { defaultVault } from "@/lib/config";
import { signToken, verifyToken } from "@/lib/auth";
import { arquivoPessoa, getPessoas, today, updateNote, type Pessoa } from "./data";
import { enviarWhatsApp, normalizarFone } from "./whatsapp";

// "Meu perfil": the person (or gestão, or a cadastro link) edits their own Miembros note.
// WhatsApp is verified with a 6-digit code sent to it; only the verified number gets notices
// (scripts/avisos/avisos.py, after the transition date).

export const IDIOMAS = ["pt", "en", "es"] as const;

export type DadosPerfil = {
  name: string; apelido: string; native_name: string; data_nascimento: string; nacionalidade: string;
  whatsapp: string; email: string; cidade: string; pais: string; idioma: string;
  area: string; funcao: string; disponibilidade: string; emergencia_nome: string; emergencia_whatsapp: string;
};

const SEGREDO = () => {
  const s = process.env.NIPEI_AUTH_SECRET;
  if (!s) throw new Error("NIPEI_AUTH_SECRET is not set");
  return s;
};
const hmac = (v: string) => createHmac("sha256", SEGREDO()).update(v).digest("base64url");
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hojeIso = today;

/** Initial values for PerfilForm (client) from the person's note. */
export const inicialPerfil = (p: Pessoa) => ({
  id: p.id, nipeiId: p.nipeiId, whatsappVerificado: p.whatsappVerificado, temFoto: !!p.foto,
  name: p.name, apelido: p.apelido, native_name: p.nativeName, data_nascimento: p.dataNascimento, nacionalidade: p.nacionalidade,
  whatsapp: p.whatsapp, email: p.email, cidade: p.cidade, pais: p.pais, idioma: p.idioma || "pt",
  area: p.area, funcao: p.funcao, disponibilidade: p.disponibilidade, emergencia_nome: p.emergenciaNome, emergencia_whatsapp: p.emergenciaWhatsapp,
});

/** Banner on Hoje: details never confirmed / older than a year, or WhatsApp not verified. */
export function perfilPendente(p: Pessoa): "confirmar" | "verificar" | null {
  const umAno = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  if (!p.dadosConfirmadosEm || p.dadosConfirmadosEm < umAno) return "confirmar";
  return p.whatsapp && !p.whatsappVerificado ? "verificar" : null;
}

// ---------------------------------------------------------------- WhatsApp code
// ponytail: limits live in memory (reset on deploy) — fine for a few dozen people.
const envios = new Map<string, number[]>(); // pessoa → send timestamps (last 24 h)
const tentativas = new Map<string, number>(); // code token → wrong attempts

/** Sends a 6-digit code to `fone` and returns a signed token that holds only its hash (10 min). */
export async function enviarCodigo(pessoaId: string, fone: string): Promise<string> {
  const numero = normalizarFone(fone);
  if (!numero) throw new Error("Número de WhatsApp inválido");
  const agora = Date.now();
  const recentes = (envios.get(pessoaId) ?? []).filter((t) => agora - t < 86_400_000);
  if (recentes.length && agora - recentes[recentes.length - 1] < 60_000) throw new Error("Espere 1 minuto para pedir outro código");
  if (recentes.length >= 8) throw new Error("Muitos códigos hoje; tente amanhã");
  const codigo = String(randomInt(100000, 1000000));
  const ok = await enviarWhatsApp(numero, `🌿 Seu código do Nipëi: *${codigo}*\nVale 10 minutos. Se não foi você que pediu, ignore esta mensagem.`);
  if (!ok) throw new Error("Não foi possível enviar o WhatsApp para esse número");
  envios.set(pessoaId, [...recentes, agora]);
  return signToken("wa-codigo", `${pessoaId}|${numero}|${hmac(`${codigo}|${pessoaId}|${numero}`)}`, 600);
}

/** Checks the code; on success returns a proof (1 h) that this person owns this number. */
export function verificarCodigo(pessoaId: string, token: string, codigo: string): string {
  const sub = verifyToken(token, "wa-codigo");
  if (!sub) throw new Error("Código expirado; peça outro");
  const [pid, numero, h] = sub.split("|");
  if (pid !== pessoaId) throw new Error("Código de outra pessoa");
  const n = tentativas.get(token) ?? 0;
  if (n >= 5) throw new Error("Muitas tentativas; peça outro código");
  if (!igual(hmac(`${codigo.replace(/\D/g, "")}|${pessoaId}|${numero}`), h)) {
    tentativas.set(token, n + 1);
    throw new Error("Código incorreto");
  }
  tentativas.delete(token);
  return signToken("wa-ok", `${pessoaId}|${numero}`, 3600);
}

/** Number proven by `prova` for this person, or "". */
function numeroProvado(pessoaId: string, prova: string): string {
  const sub = prova ? verifyToken(prova, "wa-ok") : null;
  const [pid, numero] = (sub ?? "").split("|");
  return pid === pessoaId ? numero ?? "" : "";
}

// ---------------------------------------------------------------- save

/**
 * Saves the profile. Validates every field; the WhatsApp stays/becomes verified only when it is the
 * already-verified number or `prova` proves the new one. Throws a user-facing message on bad input.
 */
export function salvarPerfil(pessoaId: string, d: DadosPerfil, prova: string, lgpd: boolean) {
  const file = arquivoPessoa(pessoaId);
  const atual = getPessoas().find((p) => p.id === pessoaId);
  if (!file || !atual) throw new Error("Pessoa não encontrada");
  if (!lgpd) throw new Error("É preciso autorizar o uso dos dados");
  const t = (v: string, max = 200) => String(v ?? "").trim().slice(0, max);

  const name = t(d.name, 120);
  if (!name) throw new Error("Informe o nome");
  const whatsapp = d.whatsapp ? normalizarFone(d.whatsapp) : "";
  if (d.whatsapp && !whatsapp) throw new Error("Número de WhatsApp inválido (use o código do país)");
  const emergencia = d.emergencia_whatsapp ? normalizarFone(d.emergencia_whatsapp) : "";
  if (d.emergencia_whatsapp && !emergencia) throw new Error("Número do contato de emergência inválido");
  const email = t(d.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
  const nasc = t(d.data_nascimento, 10);
  if (nasc && !(/^\d{4}-\d{2}-\d{2}$/.test(nasc) && nasc > "1900-01-01" && nasc <= hojeIso())) throw new Error("Data de nascimento inválida");

  const jaVerificado = atual.whatsappVerificado && normalizarFone(atual.whatsapp) === whatsapp && !!whatsapp;
  const provado = !!whatsapp && numeroProvado(pessoaId, prova) === whatsapp;
  const verificado = jaVerificado || provado;
  const faltam = [!email && "e-mail", !whatsapp && "WhatsApp", whatsapp && !verificado && "WhatsApp não verificado"].filter(Boolean);

  updateNote(file, {
    name, apelido: t(d.apelido, 60), native_name: t(d.native_name, 120), data_nascimento: nasc, nacionalidade: t(d.nacionalidade, 60),
    whatsapp, email, cidade: t(d.cidade, 80), pais: t(d.pais, 60),
    idioma: (IDIOMAS as readonly string[]).includes(d.idioma) ? d.idioma : "pt",
    area: t(d.area), funcao: t(d.funcao, 300), disponibilidade: t(d.disponibilidade),
    emergencia_nome: t(d.emergencia_nome, 120), emergencia_whatsapp: emergencia,
    whatsapp_verificado: verificado,
    whatsapp_verificado_em: provado ? hojeIso() : verificado ? atual.whatsappVerificadoEm : "",
    has_missing_info: faltam.length > 0,
    missing_info_details: faltam.length ? `Falta: ${faltam.join(", ")}.` : "",
    lgpd_consentimento_em: hojeIso(),
    dados_confirmados_em: hojeIso(),
    cadastro_em: hojeIso(),
  });
  return { verificado };
}

// ---------------------------------------------------------------- photo

export const FOTO_DIR = path.join("Miembros", "_fotos");

/** Profile photo (already shrunk on the phone), stored in the vault next to the notes. */
export function salvarFoto(pessoaId: string, bytes: Buffer, tipo: string) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[tipo];
  if (!ext) throw new Error("Use uma foto JPG, PNG ou WebP");
  if (bytes.length > 3 * 1024 * 1024) throw new Error("Foto maior que 3 MB");
  const file = arquivoPessoa(pessoaId);
  if (!file) throw new Error("Pessoa não encontrada");
  const dir = path.join(defaultVault()!, FOTO_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.startsWith(`${pessoaId}.`)) fs.unlinkSync(path.join(dir, f)); // one photo per person
  fs.writeFileSync(path.join(dir, `${pessoaId}.${ext}`), bytes);
  updateNote(file, { foto: `${FOTO_DIR}/${pessoaId}.${ext}`.split(path.sep).join("/") });
}

export function arquivoFoto(pessoaId: string): { abs: string; tipo: string } | null {
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p?.foto) return null;
  const base = path.resolve(defaultVault()!, FOTO_DIR);
  const abs = path.resolve(defaultVault()!, p.foto);
  if (!abs.startsWith(base + path.sep) || !fs.existsSync(abs)) return null;
  const ext = abs.split(".").pop();
  return { abs, tipo: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
}
