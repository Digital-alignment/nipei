import fs from "fs";
import path from "path";
import { getEquipes, getPessoas, getProjetos, getTarefaDetalhe, getTarefas, today, vault } from "./data";
import { getConversa, getMemoria } from "./assistente";
import { getConexoes, pessoasConectadas, salvarConexoes } from "./conexoes";
import { salvarArquivo } from "./google";

// One-way copy of each person's own slice of Nipëi into the "Nipëi" folder of their Google Drive:
// profile, their tasks, the assistant's memory about them and their conversation. The vault stays the
// only source of truth (edits in Drive never come back). Internal management notes are never copied.
// Runs at most once a day per person (lazily, from the v2 layout) and on "Fazer backup agora".

const DIA = 24 * 3600_000;

function arquivos(pessoaId: string) {
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p) throw new Error("Pessoa não encontrada");
  const equipes = getEquipes(), projetos = getProjetos();
  const nomeEq = (id: string) => equipes.find((e) => e.id === id)?.nome ?? id;
  const ficha = path.join(vault(), "Miembros", `${pessoaId}.md`);
  const minhas = getTarefas().filter((t) => t.responsaveis.includes(pessoaId)).sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || (a.prazo || "9").localeCompare(b.prazo || "9"));
  const abertas = minhas.filter((t) => t.status !== "done"), feitas = minhas.filter((t) => t.status === "done").slice(0, 100);
  const tarefa = (id: string) => {
    const d = getTarefaDetalhe(id)!;
    const t = d.tarefa;
    return [`### ${t.title}`, `- Status: ${t.statusRaw} · Prazo: ${t.prazo || "sem prazo"} · Prioridade: ${t.priority || "-"} · Equipe: ${nomeEq(t.equipe)}${t.projeto ? ` · Projeto: ${projetos.find((x) => x.id === t.projeto)?.nome ?? t.projeto}` : ""}`,
      d.doc.descricao.trim() && `\n${d.doc.descricao.trim()}`, d.doc.checklist.length ? `\n${d.doc.checklist.map((c) => `- [${c.feito ? "x" : " "}] ${c.texto}`).join("\n")}` : "", ""].filter((x) => x !== "").join("\n");
  };
  const mem = getMemoria(pessoaId), conversa = getConversa(pessoaId);
  return {
    "LEIA-ME.md": `# Sua cópia do Nipëi\n\nCópia automática (1 vez por dia) dos seus dados no Nipëi OS — ${p.name}.\nÚltima atualização: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" })}.\n\nÉ só uma cópia: mudanças feitas aqui não voltam para a plataforma. Para editar, use os.nipeihu.app.\n`,
    "Perfil.md": fs.existsSync(ficha) ? fs.readFileSync(ficha, "utf-8") : `# ${p.name}\n`,
    "Tarefas.md": `# Tarefas de ${p.name}\n\nAtualizado em ${today()}.\n\n## Abertas (${abertas.length})\n\n${abertas.map((t) => tarefa(t.id)).join("\n") || "Nenhuma.\n"}\n## Concluídas (${feitas.length})\n\n${feitas.map((t) => `- ${t.title}${t.concluidoEm ? ` (${t.concluidoEm.slice(0, 10)})` : ""}`).join("\n") || "Nenhuma."}\n`,
    "Memória do assistente.md": `# O que o assistente sabe sobre você\n\nSó entra o que você aprovou. Para apagar, use o ícone de cérebro no assistente.\n\n${mem.map((m) => `- (${m.categoria}) ${m.texto} — ${m.em.slice(0, 10)}`).join("\n") || "Nada ainda."}\n`,
    "Conversa com o assistente.md": `# Conversa com o assistente (últimas mensagens)\n\n${conversa.map((m) => `**${m.role === "user" ? "Você" : "Assistente"}** · ${m.em.slice(0, 16).replace("T", " ")}\n\n${m.content}\n`).join("\n") || "Nenhuma conversa ainda."}\n`,
  };
}

/** Writes (or overwrites) the person's files; remembers their ids so the folder doesn't fill with copies. */
export async function backupPessoa(pessoaId: string): Promise<number> {
  const conteudo = arquivos(pessoaId);
  try {
    for (const [nome, texto] of Object.entries(conteudo)) {
      const id = getConexoes(pessoaId).google?.backup?.arquivos?.[nome];
      const f = await salvarArquivo(pessoaId, { nome, conteudo: texto, tipo: "text/markdown", id });
      const c = getConexoes(pessoaId);
      if (c.google) { c.google.backup = { ...c.google.backup, arquivos: { ...c.google.backup?.arquivos, [nome]: f.id } }; salvarConexoes(pessoaId, c); }
    }
    marcar(pessoaId, { ultimoEm: new Date().toISOString(), erro: undefined });
    return Object.keys(conteudo).length;
  } catch (e) {
    marcar(pessoaId, { erro: (e as Error).message });
    throw e;
  }
}

function marcar(pessoaId: string, m: { ultimoEm?: string; erro?: string }) {
  const c = getConexoes(pessoaId);
  if (!c.google) return;
  c.google.backup = { ...c.google.backup, ...m, ...(m.ultimoEm ? {} : { ultimoEm: c.google.backup?.ultimoEm }) };
  salvarConexoes(pessoaId, c);
}

let rodando = false, ultimaVolta = 0;
/** Called from the layout: at most once an hour, backs up whoever is due (sequentially, in the background). */
export function backupsPendentes() {
  if (rodando || Date.now() - ultimaVolta < 3600_000) return;
  ultimaVolta = Date.now();
  rodando = true;
  (async () => {
    for (const id of pessoasConectadas()) {
      const g = getConexoes(id).google;
      if (!g || (g.backup?.ultimoEm && Date.now() - Date.parse(g.backup.ultimoEm) < DIA)) continue;
      await backupPessoa(id).catch(() => null); // error is kept on the connection and shown in the profile
    }
  })().finally(() => { rodando = false; });
}
