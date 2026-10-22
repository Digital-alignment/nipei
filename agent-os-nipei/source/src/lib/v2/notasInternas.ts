import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { requestSync } from "@/lib/tarefaNote";
import { getPessoas, vault, type Me } from "./data";

// Internal notes about a person: only management (Equipe 1, logged in = not suspended) sees, edits and
// comments them. They live in Gestao_Interna/Notas_pessoas/<pessoa>.md — outside Miembros/, and
// Gestao_Interna is skipped by every vault reader that feeds the AIs (lib/vault SKIP_DIRS; hermesRAG
// only reads its own folder list), so a note never reaches Hermes, Venu or a non-management screen.
// The management assistant reads them on purpose (tool notas_internas / person page context).

export type Comentario = { por: string; em: string; texto: string };
export type NotaInterna = { id: string; por: string; em: string; texto: string; editadoPor?: string; editadoEm?: string; comentarios: Comentario[] };

export const DIR_NOTAS = path.join("Gestao_Interna", "Notas_pessoas");
const arq = (pessoaId: string) => path.join(vault(), DIR_NOTAS, `${pessoaId.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`);
export const podeNotasInternas = (me: Me) => me.gestao;

export function getNotas(pessoaId: string): NotaInterna[] {
  try {
    const m = fs.readFileSync(arq(pessoaId), "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const fm = (m && yaml.load(m[1])) as { notas?: NotaInterna[] } | null;
    return (fm?.notas ?? []).map((n) => ({ ...n, comentarios: n.comentarios ?? [] }));
  } catch { return []; }
}

/** Counts per person (lists show a small badge). */
export function contagemNotas(): Record<string, number> {
  const dir = path.join(vault(), DIR_NOTAS);
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f.slice(0, -3), getNotas(f.slice(0, -3)).length]));
}

function salvar(pessoaId: string, notas: NotaInterna[]) {
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p) throw new Error("Pessoa não encontrada");
  const corpo = [`# Notas internas · ${p.name}`, "", "> Só a gestão (Equipe 1) vê estas notas.", "",
    ...notas.flatMap((n) => [`## ${n.em.slice(0, 16).replace("T", " ")} · ${n.por}${n.editadoEm ? ` (editada por ${n.editadoPor})` : ""}`, "", n.texto, "",
      ...n.comentarios.map((c) => `- ${c.em.slice(0, 16).replace("T", " ")} · ${c.por}: ${c.texto}`), ...(n.comentarios.length ? [""] : [])])].join("\n");
  fs.mkdirSync(path.dirname(arq(pessoaId)), { recursive: true });
  fs.writeFileSync(arq(pessoaId), `---\n${yaml.dump({ pessoa: pessoaId, notas }, { lineWidth: -1 })}---\n${corpo}\n`, "utf-8");
  requestSync(vault());
}

const limpo = (t: string, max: number) => t.replace(/\r/g, "").trim().slice(0, max);
const agora = () => new Date().toISOString();

export function addNota(pessoaId: string, texto: string, por: string) {
  const t = limpo(texto, 4000);
  if (!t) throw new Error("Nota vazia");
  salvar(pessoaId, [{ id: `n${Date.now().toString(36)}`, por, em: agora(), texto: t, comentarios: [] }, ...getNotas(pessoaId)]);
}

export function editarNota(pessoaId: string, notaId: string, texto: string, por: string) {
  const t = limpo(texto, 4000);
  if (!t) throw new Error("Nota vazia");
  const notas = getNotas(pessoaId);
  const n = notas.find((x) => x.id === notaId);
  if (!n) throw new Error("Nota não encontrada");
  Object.assign(n, { texto: t, editadoPor: por, editadoEm: agora() });
  salvar(pessoaId, notas);
}

export function comentarNota(pessoaId: string, notaId: string, texto: string, por: string) {
  const t = limpo(texto, 1500);
  if (!t) throw new Error("Comentário vazio");
  const notas = getNotas(pessoaId);
  const n = notas.find((x) => x.id === notaId);
  if (!n) throw new Error("Nota não encontrada");
  n.comentarios.push({ por, em: agora(), texto: t });
  salvar(pessoaId, notas);
}
