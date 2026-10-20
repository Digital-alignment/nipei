import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { contexto } from "./ia";
import { addArquivo, getPessoas, getTarefas } from "./data";
import { writeTarefa } from "@/lib/tarefaNote";
import { enviarWhatsApp } from "./whatsapp";

// T3 "Fazer por mim": the app queues a job; a worker on the VPS host runs Hermes (web search only,
// no terminal/files) and posts the result back to /api/tarefas/entregavel, which saves it here.
// Queue: <vault>/.jobs/{pendentes,rodando,feitos}/<job>.json — gitignored, never synced.
// Worker: nipei-control/scripts/hermes-worker/.

export type Trabalho = {
  id: string; taskId: string; titulo: string; pedidoPor: string; pedidoPorNome: string; instrucao: string;
  criado: string; prompt: string; estado?: "ok" | "erro"; arquivo?: string; erro?: string; terminado?: string;
};

const PASTAS = ["pendentes", "rodando", "feitos"] as const;
const raiz = () => path.join(defaultVault()!, ".jobs");
const pasta = (p: (typeof PASTAS)[number]) => { const d = path.join(raiz(), p); fs.mkdirSync(d, { recursive: true }); return d; };
const ler = (f: string): Trabalho | null => { try { return JSON.parse(fs.readFileSync(f, "utf-8")); } catch { return null; } };
const listar = (p: (typeof PASTAS)[number]) =>
  fs.readdirSync(pasta(p)).filter((f) => f.endsWith(".json")).map((f) => ler(path.join(pasta(p), f))).filter((x): x is Trabalho => !!x);

const PROMPT = (titulo: string, instrucao: string, ctx: string) => `Você é o Hermes, trabalhando para o Nipëi (Santuário Nipeihu, Aldeia Mutum, Inirau). Responda em português do Brasil.

Alguém da gestão pediu que você FAÇA o trabalho desta tarefa e entregue o resultado como um documento.
Pedido: ${instrucao || "Faça o que a tarefa pede e entregue o que for possível produzir por escrito (rascunho de mensagem ou e-mail, pesquisa com fontes, plano, resumo, proposta)."}

Regras:
- Entregue APENAS o documento final em Markdown, começando com um título "# ...". Nada antes nem depois.
- Use só o contexto abaixo e pesquisa na web; cite os links que usar numa seção "## Fontes".
- Não invente nomes, valores, datas ou contatos. Se faltar algo, diga numa seção "## O que falta" quem pode responder.
- Você não envia mensagens nem altera tarefas: escreva rascunhos prontos para a pessoa revisar e enviar.

--- Contexto da tarefa: ${titulo} ---
${ctx}`.slice(0, 100_000); // the worker passes it as one CLI argument (Linux limit ~128 KB)

export function pedirTrabalho(taskId: string, instrucao: string, pedidoPor: string, pedidoPorNome: string): Trabalho {
  const t = getTarefas().find((x) => x.id === taskId);
  if (!t) throw new Error("Tarefa não encontrada");
  if (emAndamento(taskId).length) throw new Error("O Hermes já está trabalhando nesta tarefa");
  const job: Trabalho = {
    id: `job_${Date.now().toString(36)}`, taskId, titulo: t.title, pedidoPor, pedidoPorNome,
    instrucao: instrucao.trim().slice(0, 1000), criado: new Date().toISOString(),
    prompt: PROMPT(t.title, instrucao.trim(), contexto(taskId).texto),
  };
  // Write then rename, so the worker never picks up a half-written file.
  const tmp = path.join(raiz(), `${job.id}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(job), "utf-8");
  fs.renameSync(tmp, path.join(pasta("pendentes"), `${job.id}.json`));
  writeTarefa(defaultVault()!, t.file, pedidoPorNome, () => {}, [`pediu ao Hermes: “${job.instrucao || "fazer a tarefa"}”`]);
  return job;
}

export const emAndamento = (taskId: string) => [...listar("pendentes"), ...listar("rodando")].filter((j) => j.taskId === taskId);

/** Finished jobs this person asked for in the last `dias` days (newest first) — the in-app notice. */
export const prontosPara = (pessoa: string, dias = 3) => {
  const desde = Date.now() - dias * 86400_000;
  return listar("feitos").filter((j) => j.pedidoPor === pessoa && Date.parse(j.terminado ?? j.criado) >= desde)
    .sort((a, b) => (b.terminado ?? "").localeCompare(a.terminado ?? ""));
};

/**
 * Called by the worker (Bearer token) with Hermes's output. Only a job currently in `rodando/`
 * is accepted, so the endpoint can't be used to write arbitrary attachments.
 */
export async function receberEntrega(jobId: string, ok: boolean, resultado: string): Promise<Trabalho> {
  const f = path.join(pasta("rodando"), `${jobId.replace(/[^a-z0-9_]/gi, "")}.json`);
  const job = fs.existsSync(f) ? ler(f) : null;
  if (!job) throw new Error("Trabalho não encontrado ou não está rodando");
  const t = getTarefas().find((x) => x.id === job.taskId);
  if (!t) throw new Error("Tarefa não existe mais");
  const texto = resultado.replace(/^session_id:.*$/gm, "").trim();

  if (ok && texto) {
    const nome = `entrega_hermes_${new Date().toISOString().slice(0, 10)}.md`;
    job.arquivo = addArquivo(job.taskId, { nome, bytes: Buffer.from(texto, "utf-8") }, "Hermes", "hermes");
    writeTarefa(defaultVault()!, t.file, "Hermes", () => {}, [`entregou o trabalho pedido por ${job.pedidoPorNome}`]);
    job.estado = "ok";
  } else {
    job.estado = "erro";
    job.erro = texto.slice(0, 500) || "sem resposta";
    writeTarefa(defaultVault()!, t.file, "Hermes", () => {}, [`não conseguiu concluir o trabalho pedido por ${job.pedidoPorNome}: ${job.erro.replace(/\s+/g, " ").slice(0, 200)}`]);
  }
  job.terminado = new Date().toISOString();
  fs.writeFileSync(path.join(pasta("feitos"), `${job.id}.json`), JSON.stringify({ ...job, prompt: undefined }), "utf-8");
  fs.unlinkSync(f);
  await avisarWhatsApp(job, t.id);
  return job;
}

/** WhatsApp notice to whoever asked (Evolution API). Best effort: the in-app notice always exists. */
async function avisarWhatsApp(job: Trabalho, taskId: string) {
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "https://os.nipeihu.app";
  const fone = getPessoas().find((p) => p.id === job.pedidoPor)?.whatsapp ?? "";
  // Best effort: the notice on Hoje and in the task activity always exists.
  await enviarWhatsApp(fone, job.estado === "ok"
    ? `✅ O Hermes terminou: "${job.titulo}". Veja o documento: ${app}/tarefas/${taskId}`
    : `⚠️ O Hermes não conseguiu concluir "${job.titulo}". Detalhes: ${app}/tarefas/${taskId}`);
}
