import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { motorIA } from "./motorIA";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { getEquipes, getObjetivos, getPessoas, getProjetos, getTarefaDetalhe, getTarefas, type Status } from "./data";
import { buscarConhecimento, formatarConhecimento } from "./conhecimento";

// T2: the AI only *proposes*; a person reviews and applies (actions.ts aplicarIAAction).
// Model via OpenRouter (key already on the server). Override with NIPEI_IA_MODEL.

export type ModoIA = "detalhar" | "proximo" | "atualizar";
export type PropostaIA = {
  modo: ModoIA;
  modelo: string;
  resumo: string;
  descricao: string | null;
  checklistAdicionar: string[];
  checklistConcluir: string[];
  proximoPasso: string | null;
  status: Status | null;
  prazo: string | null;
  fontes: string[];
};

const LIMITE_DIA = 60;
// ponytail: per-process daily counter (resets on deploy); move to the vault or a DB if cost needs real tracking.
const uso = new Map<string, { dia: string; n: number }>();

const INSTRUCOES: Record<ModoIA, string> = {
  detalhar:
    "Explique e detalhe a tarefa: escreva em `descricao` o que precisa ser feito, por quê e o contexto (em markdown curto), mantendo tudo o que a descrição atual já diz. Em `checklistAdicionar`, de 3 a 8 passos concretos e verificáveis que ainda não estão na checklist. Não mude status nem prazo.",
  proximo:
    "Diga qual é o próximo passo concreto agora: uma ação única, específica (quem, o quê, como), em `proximoPasso`. Se fizer sentido, um item novo em `checklistAdicionar`. Explique o porquê em `resumo`. Não reescreva a descrição.",
  atualizar:
    "Leia os anexos e os comentários recentes e atualize a tarefa: em `descricao`, a descrição atual mais os fatos novos (não apague informação existente); em `checklistConcluir`, os itens EXISTENTES (texto exato) que os anexos/comentários mostram que já foram feitos; `status` e `prazo` só se houver evidência clara. Diga em `resumo` o que mudou e com base em quê.",
};

const SISTEMA = `Você é o assistente de tarefas do Nipëi OS (Santuário Nipeihu, Aldeia Mutum, Inirau). Responda SEMPRE em português do Brasil.
Regras:
- Zero alucinação: use só o que está no contexto (tarefa, base de conhecimento, notas do vault, anexos). Não invente nomes, datas, valores, contatos nem fatos.
- A "Base de conhecimento confirmada" prevalece sobre as notas antigas; se a tarefa contradiz a base, aponte isso em \`resumo\`.
- Se faltar informação, diga em \`resumo\` o que falta e a quem perguntar.
- Liste em \`fontes\` as notas/anexos/comentários que você usou.
- Responda APENAS com um objeto JSON, sem texto antes ou depois, com estas chaves:
{"resumo": string, "descricao": string|null, "checklistAdicionar": string[], "checklistConcluir": string[], "proximoPasso": string|null, "status": "todo"|"doing"|"done"|null, "prazo": "AAAA-MM-DD"|null, "fontes": string[]}`;

export type Parte = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } } | { type: "file"; file: { filename: string; file_data: string } };

export function contexto(id: string): { texto: string; anexos: Parte[] } {
  const det = getTarefaDetalhe(id);
  if (!det) throw new Error("Tarefa não encontrada");
  const { tarefa, doc, anexos } = det;
  const pessoas = getPessoas();
  const equipes = getEquipes();
  const nomesEquipes = (ids: string[]) => ids.map((e) => equipes.find((x) => x.id === e)?.nome ?? e).join(", ");
  const pessoa = (pid: string) => {
    const p = pessoas.find((x) => x.id === pid);
    return p ? `${p.name}${p.funcao ? ` — ${p.funcao}${p.area ? `, ${p.area}` : ""}` : ""}${p.equipes.length ? ` [${nomesEquipes(p.equipes)}]` : ""}` : pid;
  };
  const equipe = equipes.find((e) => e.id === tarefa.equipe);
  const gestao = equipes.filter((e) => e.gestao).flatMap((e) => e.membros).map((m) => pessoas.find((p) => p.id === m)?.name ?? m);
  const projeto = getProjetos().find((p) => p.id === tarefa.projeto);
  const objetivo = getObjetivos().find((o) => o.id === tarefa.objetivo);
  const relacionadas = getTarefas()
    .filter((t) => t.id !== id && ((tarefa.projeto && t.projeto === tarefa.projeto) || (tarefa.objetivo && t.objetivo === tarefa.objetivo) || (tarefa.equipe && t.equipe === tarefa.equipe)))
    .slice(0, 15);
  const rag = queryVaultGrounding(`${tarefa.title} ${doc.descricao}`.slice(0, 500), "squad_1_ceo");
  const base = buscarConhecimento(`${tarefa.title} ${doc.descricao} ${doc.checklist.map((c) => c.texto).join(" ")}`, {
    equipe: tarefa.equipe, projetos: tarefa.projeto ? [tarefa.projeto] : [], objetivos: tarefa.objetivo ? [tarefa.objetivo] : [], pessoas: tarefa.responsaveis, limite: 15,
  });

  const linhas = [
    `# Tarefa ${tarefa.id}: ${tarefa.title}`,
    `Status: ${tarefa.statusRaw || "A fazer"} · Prazo: ${tarefa.prazo || "sem prazo"} · Hoje: ${new Date().toISOString().slice(0, 10)}`,
    `Equipe: ${equipe?.nome ?? "sem equipe"}${tarefa.area ? ` (área ${tarefa.area})` : ""}`,
    `Responsáveis: ${tarefa.responsaveis.map(pessoa).join("; ") || tarefa.responsible || "ninguém"}`,
    equipe ? `Coordenação da equipe: ${equipe.coordenadores.map(pessoa).join("; ")}` : "",
    `Gestão (Equipe 1, decide e aprova): ${gestao.join(", ")}`,
    projeto ? `Projeto: ${projeto.nome} — ${projeto.descricao}` : "",
    objetivo ? `Objetivo ${objetivo.ano}: ${objetivo.titulo} — ${objetivo.descricao}` : "",
    "", "## Descrição atual", doc.descricao || "(vazia)",
    "", "## Checklist atual", ...(doc.checklist.length ? doc.checklist.map((c) => `- [${c.feito ? "x" : " "}] ${c.texto}`) : ["(vazia)"]),
    "", "## Atividade e comentários (mais recentes primeiro)", ...doc.atividade.slice(0, 40),
    doc.origem ? `\n## Origem\n${doc.origem}` : "",
    "", "## Links anexados", ...(anexos.filter((a) => a.tipo === "link").map((a) => `- ${a.titulo}: ${a.url}`) || []),
    "", "## Tarefas relacionadas (mesmo projeto/objetivo/equipe)", ...relacionadas.map((t) => `- ${t.title} [${t.statusRaw || "A fazer"}${t.prazo ? `, ${t.prazo}` : ""}]`),
    "", "## Base de conhecimento confirmada (fonte de verdade; revisada pela gestão)", base.length ? formatarConhecimento(base) : "(nada confirmado sobre este assunto)",
    "", "## Notas antigas do vault (não revisadas; se contradizem a base confirmada, vale a base)",
    ...(rag.citations ?? []).filter((c) => !c.path.startsWith("Conhecimento/")).slice(0, 5).map((c) => `### ${c.title} (${c.path})\n${c.snippet.slice(0, 1200)}`),
  ];

  // Attached files: photos and PDFs go to the model as they are; text files inline. Newest 6 only.
  const vault = defaultVault()!;
  const partes: Parte[] = [];
  for (const a of anexos.filter((x) => x.tipo === "arquivo" && x.path).slice(-6)) {
    const abs = path.resolve(vault, a.path);
    if (!abs.startsWith(path.resolve(vault) + path.sep) || !fs.existsSync(abs)) continue;
    const ext = abs.split(".").pop()?.toLowerCase() ?? "";
    const buf = fs.readFileSync(abs);
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) && buf.length <= 5 * 1024 * 1024) {
      partes.push({ type: "text", text: `Anexo (imagem): ${a.titulo}` });
      partes.push({ type: "image_url", image_url: { url: `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}` } });
    } else if (ext === "pdf" && buf.length <= 8 * 1024 * 1024) {
      partes.push({ type: "file", file: { filename: a.titulo, file_data: `data:application/pdf;base64,${buf.toString("base64")}` } });
    } else if (["txt", "md", "csv"].includes(ext)) {
      partes.push({ type: "text", text: `Anexo (texto): ${a.titulo}\n${buf.toString("utf-8").slice(0, 50000)}` });
    } else {
      linhas.push(`- Anexo não lido pela IA (formato ${ext}): ${a.titulo}`);
    }
  }
  return { texto: linhas.filter((l) => l !== "").join("\n"), anexos: partes };
}

const strArr = (v: unknown) => (Array.isArray(v) ? v.map(String).map((x) => x.trim()).filter(Boolean) : []);

/** Counts one AI use for this person today; throws past the daily limit. */
export function contarUso(quem: string) {
  const dia = new Date().toISOString().slice(0, 10);
  const u = uso.get(quem);
  const n = u?.dia === dia ? u.n : 0;
  if (n >= LIMITE_DIA) throw new Error(`Limite diário de ${LIMITE_DIA} usos da IA atingido`);
  uso.set(quem, { dia, n: n + 1 });
}

/** One OpenRouter call → the model's raw answer. */
async function chamarModelo(sistema: string, conteudo: Parte[], maxTokens: number, timeoutMs: number): Promise<{ raw: string; modelo: string }> {
  const m = motorIA(), modelo = m.modelo;
  const res = await fetch(m.url, {
    method: "POST",
    headers: m.headers,
    body: JSON.stringify({ model: modelo, temperature: 0.2, max_tokens: maxTokens, messages: [{ role: "system", content: sistema }, { role: "user", content: conteudo }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`IA indisponível (${res.status})`);
  const data = await res.json();
  return { raw: data?.choices?.[0]?.message?.content ?? "", modelo };
}

/** One OpenRouter call that must answer with a JSON object (shared by tasks and Conhecimento). */
export async function chamarIA(sistema: string, conteudo: Parte[], maxTokens = 2500, timeoutMs = 90_000): Promise<{ o: Record<string, unknown>; modelo: string }> {
  const { raw, modelo } = await chamarModelo(sistema, conteudo, maxTokens, timeoutMs);
  try {
    return { o: JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)), modelo };
  } catch {
    throw new Error("A IA respondeu num formato inesperado; tente de novo");
  }
}

/** For long markdown (reports, agendas, translations): plain text is sturdier than markdown inside JSON. */
export async function chamarIATexto(sistema: string, conteudo: Parte[], maxTokens = 6000, timeoutMs = 180_000): Promise<string> {
  const { raw } = await chamarModelo(sistema, conteudo, maxTokens, timeoutMs);
  const texto = raw.trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/, "$1").trim();
  if (!texto) throw new Error("A IA não devolveu texto; tente de novo");
  return texto;
}

export async function proporIA(id: string, modo: ModoIA, quem: string): Promise<PropostaIA> {
  contarUso(quem);
  const { texto, anexos } = contexto(id);
  const { o, modelo } = await chamarIA(SISTEMA, [{ type: "text", text: `${INSTRUCOES[modo]}\n\n${texto}` }, ...anexos]);

  const det = getTarefaDetalhe(id)!;
  const existentes = new Set(det.doc.checklist.map((c) => c.texto));
  const status = ["todo", "doing", "done"].includes(String(o.status)) ? (o.status as Status) : null;
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(o.prazo ?? "")) ? String(o.prazo) : null;
  const descricao = typeof o.descricao === "string" && o.descricao.trim() && o.descricao.trim() !== det.doc.descricao.trim() ? o.descricao.trim() : null;
  return {
    modo, modelo,
    resumo: String(o.resumo ?? "").trim(),
    descricao: modo === "proximo" ? null : descricao,
    checklistAdicionar: strArr(o.checklistAdicionar).filter((x) => !existentes.has(x)).slice(0, 10),
    // Only items that really exist and are still open can be ticked.
    checklistConcluir: strArr(o.checklistConcluir).filter((x) => det.doc.checklist.some((c) => c.texto === x && !c.feito)),
    proximoPasso: typeof o.proximoPasso === "string" && o.proximoPasso.trim() ? o.proximoPasso.trim() : null,
    status: modo === "atualizar" && status !== det.tarefa.status ? status : null,
    prazo: modo === "atualizar" && prazo !== det.tarefa.prazo ? prazo : null,
    fontes: strArr(o.fontes).slice(0, 10),
  };
}
