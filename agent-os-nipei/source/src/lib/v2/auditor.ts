import fs from "fs";
import path from "path";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIA } from "./ia";
import { getFatos, palavras, type Fato } from "./conhecimento";
import { noteText, readDir, today, updateNote, vault, type FmValue } from "./data";

// K2 — knowledge auditor. Compares facts with the rest of the base and opens alerts:
//   contradicao   says something different from a confirmed fact
//   ja_corrigido  repeats something that was already discarded or replaced
//   duplicado     says the same as a confirmed fact
//   desatualizado a confirmed deadline already passed (no AI: checked by date)
// Alerts never change anything by themselves: a person resolves them (resolverAlerta).
//
//   Conhecimento/Alertas/<id>.md   one note per alert
//   Conhecimento/.auditoria         date of the last weekly audit

const ALERTAS = path.join("Conhecimento", "Alertas");
const MARCA = path.join("Conhecimento", ".auditoria");
export const TIPOS_ALERTA = ["contradicao", "ja_corrigido", "duplicado", "desatualizado"] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];
export const ACOES = ["substituir", "eliminar", "editar", "manter"] as const;
export type Acao = (typeof ACOES)[number];

export type Alerta = {
  id: string; file: string; tipo: TipoAlerta; fato: string; outros: string[]; equipe: string; explicacao: string; sugestao: string;
  status: "aberta" | "resolvida"; resolucao: string; resolvidoPor: string; resolvidoEm: string; criadoEm: string;
};

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);

export function getAlertas(): Alerta[] {
  return readDir(ALERTAS).filter(({ fm }) => fm.type === "alerta").map(({ file, fm }) => ({
    id: s(fm.id), file, tipo: s(fm.tipo) as TipoAlerta, fato: s(fm.fato), outros: arr(fm.outros), equipe: s(fm.equipe),
    explicacao: s(fm.explicacao), sugestao: s(fm.sugestao), status: (s(fm.status) || "aberta") as Alerta["status"],
    resolucao: s(fm.resolucao), resolvidoPor: s(fm.resolvido_por), resolvidoEm: s(fm.resolvido_em), criadoEm: s(fm.criado_em),
  })).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

function criarAlerta(a: { tipo: TipoAlerta; fato: Fato; outros: string[]; explicacao: string; sugestao: string }) {
  const id = `alr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const fm: Record<string, FmValue> = {
    id, type: "alerta", tipo: a.tipo, fato: a.fato.id, outros: a.outros, equipe: a.fato.equipe,
    explicacao: a.explicacao.slice(0, 500), sugestao: a.sugestao.slice(0, 600), status: "aberta",
    resolucao: "", resolvido_por: "", resolvido_em: "", criado_em: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(vault(), ALERTAS), { recursive: true });
  fs.writeFileSync(path.join(vault(), ALERTAS, `${a.tipo}_${id.slice(4)}.md`), noteText(fm, `${a.explicacao}\n\nFato: [[${a.fato.id}]] · Outros: ${a.outros.map((o) => `[[${o}]]`).join(", ")}`), "utf-8");
}

// ---------------------------------------------------------------- candidates (no AI)

const tags = (f: Fato) => new Set([f.equipe && `e:${f.equipe}`, ...f.projetos.map((x) => `p:${x}`), ...f.objetivos.map((x) => `o:${x}`), ...f.pessoas.map((x) => `h:${x}`)].filter(Boolean) as string[]);

/** How related two facts look: shared words (Jaccard) + a little for each shared team/project/person. */
export function parecido(a: Fato, b: Fato) {
  const pa = palavras(a.texto), pb = palavras(b.texto);
  const comuns = [...pa].filter((w) => pb.has(w)).length;
  const jac = comuns / (pa.size + pb.size - comuns || 1);
  const ta = tags(a), tb = tags(b);
  return jac + 0.08 * [...ta].filter((x) => tb.has(x)).length;
}

// ---------------------------------------------------------------- AI judgement

const SISTEMA = `Você é o auditor da base de conhecimento do Nipëi OS. Responda em português do Brasil.
Para cada fato NOVO você recebe fatos EXISTENTES parecidos, com o status de cada um:
- confirmado: verdade atual da base;
- descartado ou substituido: algo que já foi corrigido ou rejeitado antes.
Abra um alerta só quando tiver certeza:
- "contradicao": o novo diz algo diferente de um confirmado (data, valor, responsável, regra…);
- "ja_corrigido": o novo repete o conteúdo de um descartado/substituido (algo já corrigido voltando);
- "duplicado": o novo diz o mesmo que um confirmado, sem informação nova.
Fatos sobre coisas diferentes, ou que só se complementam, NÃO são alerta. Na dúvida, não abra.
"explicacao": uma frase clara para quem vai decidir. "sugestao": texto corrigido do fato novo, se fizer sentido, senão "".
Responda APENAS com JSON: {"alertas": [{"fato": id_novo, "outros": [ids_existentes], "tipo": "contradicao"|"ja_corrigido"|"duplicado", "explicacao": string, "sugestao": string}]}`;

/** Audits these facts against the rest of the base (other sources only). Opens alerts; returns how many. */
export async function auditarFatos(ids: string[], limiar = 0.18): Promise<number> {
  const todos = getFatos();
  const novos = todos.filter((f) => ids.includes(f.id));
  // a fact discarded only as a duplicate was never "wrong": it can't make its twin look already-corrected
  const base = todos.filter((f) => f.status !== "proposto" && f.motivo !== "duplicado");
  const abertos = new Set(getAlertas().map((a) => `${a.fato}|${a.tipo}`));
  const casos = novos.map((n) => ({
    n, candidatos: base.filter((b) => b.id !== n.id && b.fonte !== n.fonte)
      .map((b) => ({ b, p: parecido(n, b) })).filter((x) => x.p >= limiar).sort((x, y) => y.p - x.p).slice(0, 6).map((x) => x.b),
  })).filter((c) => c.candidatos.length);
  let n = 0;
  // ponytail: 25 facts per AI call; a source has ≤40 facts and the weekly pass only re-checks the week's facts.
  for (let i = 0; i < casos.length; i += 25) {
    const lote = casos.slice(i, i + 25);
    const texto = lote.map(({ n: f, candidatos }) => [
      `### NOVO ${f.id} (${f.tipo}${f.dataReferencia ? `, ${f.dataReferencia}` : ""}): ${f.texto}`,
      ...candidatos.map((c) => `- EXISTENTE ${c.id} [${c.status}${c.dataReferencia ? `, ${c.dataReferencia}` : ""}]: ${c.texto}`),
    ].join("\n")).join("\n\n");
    const { o } = await chamarIA(SISTEMA, [{ type: "text", text: `Hoje: ${today()}\n\n${texto}` }], 3000, 120_000);
    for (const a of (Array.isArray(o.alertas) ? o.alertas : []) as Record<string, unknown>[]) {
      const caso = lote.find((c) => c.n.id === s(a.fato));
      const tipo = s(a.tipo) as TipoAlerta;
      if (!caso || !["contradicao", "ja_corrigido", "duplicado"].includes(tipo) || abertos.has(`${caso.n.id}|${tipo}`)) continue;
      const outros = arr(a.outros).filter((o) => caso.candidatos.some((c) => c.id === o));
      // the AI must point at facts with the right status for the alert it opens
      const ok = outros.filter((o) => {
        const st = caso.candidatos.find((c) => c.id === o)!.status;
        return tipo === "ja_corrigido" ? st === "descartado" || st === "substituido" : st === "confirmado";
      });
      if (!ok.length) continue;
      criarAlerta({ tipo, fato: caso.n, outros: ok, explicacao: s(a.explicacao), sugestao: s(a.sugestao) });
      abertos.add(`${caso.n.id}|${tipo}`);
      n++;
    }
  }
  if (n) requestSync(vault());
  return n;
}

/** Confirmed deadlines that already passed get one alert each (never reopened once resolved). */
export function prazosVencidos(): number {
  const ja = new Set(getAlertas().filter((a) => a.tipo === "desatualizado").map((a) => a.fato));
  const hoje = today();
  let n = 0;
  for (const f of getFatos().filter((x) => x.status === "confirmado" && x.tipo === "prazo" && x.dataReferencia && x.dataReferencia < hoje && !ja.has(x.id))) {
    criarAlerta({ tipo: "desatualizado", fato: f, outros: [], explicacao: `O prazo de ${f.dataReferencia.split("-").reverse().join("/")} já passou. Ainda vale, foi cumprido ou mudou?`, sugestao: "" });
    n++;
  }
  if (n) requestSync(vault());
  return n;
}

// ---------------------------------------------------------------- weekly pass

let rodando = false;

/** Once a week (lazily, from a page view): deadlines + the facts confirmed in the last 7 days against everything. */
export async function auditoriaSemanal(forcar = false) {
  const marca = path.join(vault(), MARCA);
  const ultima = fs.existsSync(marca) ? fs.readFileSync(marca, "utf-8").trim() : "";
  const semana = new Date(Date.now() - 7 * 86_400_000).toISOString();
  if (rodando || (!forcar && ultima > semana)) return;
  rodando = true;
  try {
    fs.mkdirSync(path.dirname(marca), { recursive: true });
    fs.writeFileSync(marca, new Date().toISOString());
    prazosVencidos();
    const recentes = getFatos().filter((f) => f.status === "confirmado" && f.revisadoEm >= (ultima || semana)).map((f) => f.id);
    if (recentes.length) await auditarFatos(recentes);
  } catch (e) {
    console.warn("[auditor] auditoria semanal falhou:", (e as Error).message);
  } finally {
    rodando = false;
  }
}

// ---------------------------------------------------------------- resolving

/**
 * substituir: the fact is right → confirmed; the other facts become "substituido" by it.
 * eliminar:   the fact is wrong → discarded.
 * editar:     fix the fact's text and confirm it; the other facts become "substituido".
 * manter:     both are fine / still valid → only closes the alert.
 */
export function resolverAlerta(id: string, acao: Acao, quem: string, texto = "") {
  const a = getAlertas().find((x) => x.id === id && x.status === "aberta");
  if (!a) throw new Error("Alerta não encontrado");
  const fatos = getFatos();
  const fato = fatos.find((f) => f.id === a.fato);
  const agora = new Date().toISOString();
  if (fato && (acao === "substituir" || acao === "editar")) {
    const novo = texto.trim().slice(0, 600);
    updateNote(fato.file, { status: "confirmado", revisado_por: quem, revisado_em: agora, ...(acao === "editar" && novo ? { texto: novo } : {}) });
    for (const o of fatos.filter((f) => a.outros.includes(f.id) && f.status === "confirmado")) {
      updateNote(o.file, { status: "substituido", substituido_por: fato.id, revisado_por: quem, revisado_em: agora });
    }
  } else if (fato && acao === "eliminar") {
    updateNote(fato.file, { status: "descartado", revisado_por: quem, revisado_em: agora, ...(a.tipo === "duplicado" ? { descartado_motivo: "duplicado" } : {}) });
  }
  updateNote(a.file, { status: "resolvida", resolucao: acao, resolvido_por: quem, resolvido_em: agora });
}
