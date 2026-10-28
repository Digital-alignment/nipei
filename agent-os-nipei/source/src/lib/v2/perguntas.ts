import fs from "fs";
import path from "path";
import { requestSync } from "@/lib/tarefaNote";
import { getPessoas, noteText, readDir, updateNote, vault, type FmValue } from "./data";
import { chaveTrecho, criarFonte, processarFonte } from "./conhecimento";
import { enviarWhatsApp } from "./whatsapp";

// C8 — open questions. When "Perguntar à base" finds nothing confirmed, the person can leave the question for the
// community (Conhecimento/Perguntas/<id>.md — under Conhecimento/, so no AI reads it as knowledge). Anyone answers;
// each answer is a source (canal "pergunta") and goes through the normal review: an answer is never true by itself.
// The asker gets a WhatsApp notice when someone answers (if they take notices). The asker or gestão can archive.

const DIR = path.join("Conhecimento", "Perguntas");
export type Pergunta = {
  id: string; file: string; texto: string; por: string; em: string; equipe: string;
  status: "aberta" | "respondida" | "arquivada"; respostas: string[]; chave: string;
};
const s = (v: unknown) => (v == null ? "" : String(v).trim());

export function getPerguntas(): Pergunta[] {
  return readDir(DIR).filter(({ fm }) => fm.type === "pergunta").map(({ file, fm }) => ({
    id: s(fm.id), file, texto: s(fm.texto), por: s(fm.por), em: s(fm.em), equipe: s(fm.equipe),
    status: (s(fm.status) || "aberta") as Pergunta["status"], respostas: Array.isArray(fm.respostas) ? fm.respostas.map(s).filter(Boolean) : [], chave: s(fm.chave),
  })).sort((a, b) => b.em.localeCompare(a.em));
}

/** A new open question; the same text still open returns that one instead. */
export function criarPergunta(texto: string, por: string, equipe = ""): { id: string; ja: boolean } {
  const t = texto.replace(/\s+/g, " ").trim().slice(0, 300);
  if (t.length < 8) throw new Error("Escreva a pergunta");
  const chave = chaveTrecho("q", t.toLowerCase());
  const ja = getPerguntas().find((p) => p.chave === chave && p.status === "aberta");
  if (ja) return { id: ja.id, ja: true };
  const id = `prg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const fm: Record<string, FmValue> = { id, type: "pergunta", texto: t, por, em: new Date().toISOString(), equipe, status: "aberta", respostas: [], chave };
  fs.mkdirSync(path.join(vault(), DIR), { recursive: true });
  fs.writeFileSync(path.join(vault(), DIR, `${id}.md`), noteText(fm, t), "utf-8");
  requestSync(vault());
  return { id, ja: false };
}

/** An answer becomes a Conhecimento source (reviewed like any other); the question is marked answered. */
export function responderPergunta(id: string, resposta: string, por: { id: string; nome: string }): string {
  const p = getPerguntas().find((x) => x.id === id && x.status !== "arquivada");
  if (!p) throw new Error("Pergunta não encontrada");
  const r = resposta.trim().slice(0, 5000);
  if (r.length < 20) throw new Error("Escreva uma resposta com pelo menos uma frase");
  const fonte = criarFonte({
    tipo: "texto", titulo: `Resposta: ${p.texto.slice(0, 120)}`, texto: `Pergunta: ${p.texto}\n\nResposta de ${por.nome}: ${r}`,
    por: por.id, canal: "pergunta", chave: chaveTrecho("r", `${id}:${r}`), equipe: p.equipe || undefined,
  });
  void processarFonte(fonte);
  updateNote(p.file, { status: "respondida", respostas: [...p.respostas, fonte], respondida_em: new Date().toISOString() });
  // tell the asker (not when answering one's own question; only people who take WhatsApp notices)
  const autor = getPessoas().find((x) => x.id === p.por);
  if (autor && autor.id !== por.id && autor.whatsapp && autor.avisosWhatsapp && !autor.suspenso) {
    void enviarWhatsApp(autor.whatsapp, `${por.nome} respondeu a sua pergunta no Conhecimento:\n_${p.texto}_\n\n${r.slice(0, 600)}${r.length > 600 ? "…" : ""}\n\n(A resposta passa pela revisão antes de valer como fato.)\nhttps://os.nipeihu.app/conhecimento/${fonte}`).catch(() => {});
  }
  return fonte;
}

export function arquivarPergunta(id: string, quem: string) {
  const p = getPerguntas().find((x) => x.id === id);
  if (p) updateNote(p.file, { status: "arquivada", arquivada_por: quem, arquivada_em: new Date().toISOString() });
}
