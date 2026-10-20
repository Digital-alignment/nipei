import fs from "fs";
import path from "path";
import { signToken } from "@/lib/auth";
import { chamarIATexto } from "./ia";
import { enviarWhatsApp } from "./whatsapp";
import { getTarefas, today, vault, type Pessoa } from "./data";

// "Notificar": gestão (or the person's coordinator) sends a WhatsApp from the Nipëi number (Evolution).
// Drafts are always shown and editable before sending; every send is logged privately (outside git)
// and rate-limited so the shared number isn't flagged as spam.

export const TIPOS = ["livre", "resumo", "alerta", "cadastro", "acesso"] as const;
export type Tipo = (typeof TIPOS)[number];
export type Envio = { em: string; por: string; tipo: Tipo; texto: string };

export const LIMITE_PESSOA_HORA = 3;
export const LIMITE_REMETENTE_DIA = 30;
export const MAX_CARACTERES = 1500;
const CADASTRO_TTL = 60 * 60 * 24 * 30;
const LOGIN_LINK_TTL = 60 * 60 * 24 * 7;

const DIR = () => path.join(vault(), ".jobs", "mensagens");
const ARQ = (id: string) => path.join(DIR(), `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.jsonl`);
const idioma = (p: Pessoa) => (p.idioma === "en" || p.idioma === "es" ? p.idioma : "pt");
const chamado = (p: Pessoa) => (p.apelido || p.name).split(/[\s(]/)[0];

export function historico(pessoaId: string, max = 20): Envio[] {
  try {
    return fs.readFileSync(ARQ(pessoaId), "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).reverse().slice(0, max);
  } catch { return []; }
}

// ---------------------------------------------------------------- ready-made texts (no AI)

const TXT = {
  pt: { ola: "Olá", resumo: "aqui está o resumo das suas tarefas no Nipëi:", atrasadas: "Atrasadas", hoje: "Para hoje", proximas: "Próximas", nada: "você não tem tarefas com prazo pendentes. 🌿", ver: "Ver no Nipëi",
    cadastro: "este é o seu link para completar o cadastro no Nipëi:", acesso: "este é o seu link para entrar no Nipëi (vale 7 dias):" },
  en: { ola: "Hi", resumo: "here is a summary of your tasks in Nipëi:", atrasadas: "Overdue", hoje: "Due today", proximas: "Coming up", nada: "you have no pending tasks with a due date. 🌿", ver: "Open Nipëi",
    cadastro: "here is your link to complete your registration in Nipëi:", acesso: "here is your link to log in to Nipëi (valid for 7 days):" },
  es: { ola: "Hola", resumo: "este es el resumen de tus tareas en Nipëi:", atrasadas: "Atrasadas", hoje: "Para hoy", proximas: "Próximas", nada: "no tienes tareas con fecha pendientes. 🌿", ver: "Ver en Nipëi",
    cadastro: "este es tu enlace para completar tu registro en Nipëi:", acesso: "este es tu enlace para entrar a Nipëi (vale 7 días):" },
};

export function resumoTarefas(p: Pessoa, origin: string): string {
  const L = TXT[idioma(p)];
  const hoje = today();
  const minhas = getTarefas().filter((t) => t.status !== "done" && t.responsaveis.includes(p.id) && t.prazo);
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const bloco = (titulo: string, ts: typeof minhas, data: boolean) => ts.length
    ? [`*${titulo}* (${ts.length})`, ...ts.slice(0, 6).map((t) => `• ${t.title}${data ? ` (${dm(t.prazo)})` : ""}`), ...(ts.length > 6 ? [`…+${ts.length - 6}`] : [])].join("\n") : "";
  const atrasadas = minhas.filter((t) => t.prazo < hoje).sort((a, b) => a.prazo.localeCompare(b.prazo));
  const deHoje = minhas.filter((t) => t.prazo === hoje);
  const proximas = minhas.filter((t) => t.prazo > hoje).sort((a, b) => a.prazo.localeCompare(b.prazo));
  if (!minhas.length) return `${L.ola} ${chamado(p)}, ${L.nada}`;
  return [`${L.ola} ${chamado(p)}, ${L.resumo}`, bloco(L.atrasadas, atrasadas, true), bloco(L.hoje, deHoje, false), bloco(L.proximas, proximas, true), `👉 ${L.ver}: ${origin}/hoje`]
    .filter(Boolean).join("\n\n");
}

export function textoLink(p: Pessoa, tipo: "cadastro" | "acesso", origin: string): string {
  const L = TXT[idioma(p)];
  const url = tipo === "cadastro"
    ? `${origin}/cadastro?token=${signToken("cadastro", p.id, CADASTRO_TTL)}`
    : `${origin}/entrar?token=${signToken("login-link", p.id, LOGIN_LINK_TTL)}`;
  return `${L.ola} ${chamado(p)}, ${tipo === "cadastro" ? L.cadastro : L.acesso}\n${url}`;
}

// ---------------------------------------------------------------- AI draft

const SISTEMA = (lang: string, tipo: Tipo) => `Você escreve uma mensagem de WhatsApp da gestão do Nipëi (Santuário Nipeihu, povo Yawanawá) para uma pessoa da equipe.
Escreva em ${lang === "en" ? "inglês" : lang === "es" ? "espanhol" : "português do Brasil"}, tom caloroso, respeitoso e direto, como uma pessoa da equipe escreveria (não como robô).
${tipo === "alerta" ? "É um alerta/lembrete: deixe claro o que precisa ser feito e até quando, logo no começo." : "Siga o pedido de quem envia."}
Use o apelido da pessoa. Máximo 120 palavras, sem assinatura (ela é adicionada depois), no máximo 1 emoji. Use *negrito* do WhatsApp só se ajudar.
Use só fatos do contexto; não invente datas, valores ou tarefas. Responda só com o texto da mensagem.`;

export async function rascunhoIA(p: Pessoa, pedido: string, tipo: Tipo, remetente: string): Promise<string> {
  const hoje = today();
  const minhas = getTarefas().filter((t) => t.status !== "done" && t.responsaveis.includes(p.id));
  const contexto = [
    `Para: ${p.name} (chamar de ${chamado(p)}) · função: ${p.funcao || "-"} · hoje ${hoje}`,
    `Quem envia: ${remetente}`,
    `Pedido de quem envia: ${pedido}`,
    `Tarefas abertas da pessoa (${minhas.length}): ${minhas.slice(0, 25).map((t) => `${t.title}${t.prazo ? ` [${t.prazo}${t.prazo < hoje ? ", atrasada" : ""}]` : ""}`).join("; ") || "nenhuma"}`,
  ].join("\n");
  return (await chamarIATexto(SISTEMA(idioma(p), tipo), [{ type: "text", text: contexto }], 1200, 60_000)).slice(0, MAX_CARACTERES);
}

// ---------------------------------------------------------------- sending

function enviadosDesde(desde: number, filtro: (e: Envio, pessoa: string) => boolean): number {
  let n = 0;
  try {
    for (const f of fs.readdirSync(DIR())) {
      const pessoa = f.replace(/\.jsonl$/, "");
      for (const l of fs.readFileSync(path.join(DIR(), f), "utf-8").trim().split("\n").filter(Boolean)) {
        const e = JSON.parse(l) as Envio;
        if (Date.parse(e.em) >= desde && filtro(e, pessoa)) n++;
      }
    }
  } catch { /* no log yet */ }
  return n;
}

/** Sends (with the sender's signature), checks the limits first, and logs it. Throws a user-facing message. */
export async function enviar(p: Pessoa, texto: string, tipo: Tipo, remetente: string): Promise<void> {
  if (!p.whatsapp) throw new Error("Esta pessoa não tem WhatsApp na ficha");
  const corpo = texto.trim();
  if (!corpo) throw new Error("Mensagem vazia");
  if (corpo.length > MAX_CARACTERES) throw new Error(`Mensagem longa demais (máximo ${MAX_CARACTERES} caracteres)`);
  const agora = Date.now();
  if (enviadosDesde(agora - 3_600_000, (_, pessoa) => pessoa === p.id) >= LIMITE_PESSOA_HORA)
    throw new Error(`Limite de ${LIMITE_PESSOA_HORA} mensagens por hora para esta pessoa (proteção do número). Tente mais tarde.`);
  if (enviadosDesde(agora - 86_400_000, (e) => e.por === remetente) >= LIMITE_REMETENTE_DIA)
    throw new Error(`Você atingiu o limite de ${LIMITE_REMETENTE_DIA} mensagens hoje (proteção do número).`);
  const ok = await enviarWhatsApp(p.whatsapp, `${corpo}\n\n— ${remetente} · Nipëi`);
  if (!ok) throw new Error("O WhatsApp do Nipëi não conseguiu enviar agora. Confira a conexão do Evolution e tente de novo.");
  fs.mkdirSync(DIR(), { recursive: true });
  fs.appendFileSync(ARQ(p.id), JSON.stringify({ em: new Date().toISOString(), por: remetente, tipo, texto: corpo } satisfies Envio) + "\n", "utf-8");
}
