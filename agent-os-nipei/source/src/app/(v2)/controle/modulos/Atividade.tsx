import { getPessoas } from "@/lib/v2/data";
import { atividade, type Canal } from "@/lib/v2/eventos";
import Chip from "@/components/ds/Chip";
import Tabela, { Sparkline } from "@/components/ds/padroes/Tabela";
import LinhaDoTempo, { type TipoTempo } from "@/components/ds/padroes/LinhaDoTempo";
import { EstadoVazio } from "@/components/ds/Estados";
import type { ModuloProps } from "./index";

const CANAIS: Record<Canal, string> = { plataforma: "plataforma", assistente: "assistente", whatsapp: "WhatsApp", mcp: "app de IA", sistema: "sistema" };
const diaBahia = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Bahia" }).slice(0, 10);
const horaBahia = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" });
const rotuloDia = (d: string) => d.split("-").reverse().join("/");

/** What each person did: tasks, people organisation, assistant, WhatsApp, AI apps, logins. Filters: ?pessoa ?dias ?canal */
export default function Atividade({ q }: ModuloProps) {
  const dias = [7, 30, 90].includes(Number(q.dias)) ? Number(q.dias) : 30;
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const todos = atividade(dias);
  const acoes = todos.filter((e) => e.tipo !== "entrou");
  const ultimos14 = Array.from({ length: 14 }, (_, i) => diaBahia(new Date(Date.now() - (13 - i) * 86_400_000).toISOString()));

  const porPessoa = [...new Set(todos.map((e) => e.pessoa))].map((id) => {
    const meus = acoes.filter((e) => e.pessoa === id);
    const n = (f: (t: string) => boolean) => meus.filter((e) => f(e.tipo)).length;
    return {
      id, total: meus.length, logins: todos.filter((e) => e.pessoa === id && e.tipo === "entrou").length,
      tarefas: n((t) => /tarefa|status|atribuiu|prazo|comentou/.test(t)), pessoasOrg: n((t) => t === "organizou pessoas"),
      assistente: meus.filter((e) => e.canal === "assistente").length, whatsapp: meus.filter((e) => e.canal === "whatsapp").length, mcp: meus.filter((e) => e.canal === "mcp").length,
      ultima: meus[0]?.em ?? "", porDia: ultimos14.map((d) => meus.filter((e) => diaBahia(e.em) === d).length),
    };
  });

  const lista = todos.filter((e) => (!q.pessoa || e.pessoa === q.pessoa) && (!q.canal || e.canal === q.canal)).slice(0, 150);
  const link = (mud: Record<string, string | undefined>) => { const s = new URLSearchParams(Object.entries({ m: "atividade", dias: String(dias), pessoa: q.pessoa, canal: q.canal, ...mud }).filter(([, v]) => v) as [string, string][]); return `/controle?${s}`; };
  // nó da linha do tempo pelo tipo do evento (10.9)
  const tipo = (e: (typeof lista)[number]): TipoTempo =>
    e.canal === "assistente" || e.canal === "mcp" ? "pinu" : /conclu/.test(e.tipo) ? "concluiu" : /coment/.test(e.tipo) ? "comentou" : /status|prazo|atribuiu|organizou/.test(e.tipo) ? "estado" : "outro";

  return (
    <div className="grid gap-6">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {[7, 30, 90].map((d) => <Chip key={d} href={link({ dias: String(d) })} ativo={d === dias} icone="calendario">{`${d} dias`}</Chip>)}
        <span className="mx-1 h-5 w-px shrink-0 bg-s3" />
        <Chip href={link({ canal: undefined })} ativo={!q.canal}>todos os canais</Chip>
        {(Object.keys(CANAIS) as Canal[]).filter((c) => c !== "sistema").map((c) => <Chip key={c} href={link({ canal: c })} ativo={q.canal === c}>{CANAIS[c]}</Chip>)}
        {q.pessoa && <Chip href={link({ pessoa: undefined })} icone="fechar">{nome(q.pessoa)}</Chip>}
      </div>

      <Tabela rotulo="Atividade por pessoa" ordemInicial={{ id: "total", desc: true }} vazio={<EstadoVazio compacto selo="olho" titulo="Nada no período." />} colunas={[
        { id: "pessoa", rotulo: "Pessoa", ordenavel: true }, { id: "total", rotulo: "Ações", numero: true, ordenavel: true }, { id: "tarefas", rotulo: "Tarefas", numero: true, ordenavel: true },
        { id: "org", rotulo: "Pessoas", numero: true, ordenavel: true, soComputador: true }, { id: "assist", rotulo: "Assistente", numero: true, ordenavel: true },
        { id: "whats", rotulo: "WhatsApp", numero: true, ordenavel: true }, { id: "mcp", rotulo: "Apps IA", numero: true, ordenavel: true, soComputador: true },
        { id: "logins", rotulo: "Logins", numero: true, ordenavel: true }, { id: "dias", rotulo: "14 dias" }, { id: "ultima", rotulo: "Última", ordenavel: true, soComputador: true },
      ]} linhas={porPessoa.map((p) => ({
        id: p.id, href: link({ pessoa: p.id }),
        valores: { pessoa: nome(p.id), total: p.total, tarefas: p.tarefas, org: p.pessoasOrg, assist: p.assistente, whats: p.whatsapp, mcp: p.mcp, logins: p.logins, ultima: p.ultima },
        celulas: {
          pessoa: nome(p.id), total: <b className="font-semibold text-t1">{p.total}</b>, tarefas: p.tarefas, org: p.pessoasOrg, assist: p.assistente, whats: p.whatsapp, mcp: p.mcp, logins: p.logins,
          dias: <Sparkline pontos={p.porDia} rotulo="ações por dia, últimos 14 dias" />, ultima: p.ultima ? `${rotuloDia(diaBahia(p.ultima))} ${horaBahia(p.ultima)}` : "—",
        },
      }))} />

      <section className="grid gap-3">
        <h2 className="titulo-secao">Linha do tempo</h2>
        <LinhaDoTempo vazio={<EstadoVazio compacto selo="olho" titulo="Nada no período." />} itens={lista.map((e) => ({
          dia: rotuloDia(diaBahia(e.em)), hora: horaBahia(e.em), tipo: tipo(e), quem: nome(e.pessoa),
          texto: <>{e.tipo}{e.detalhe ? <span className="text-t3"> · {e.detalhe}</span> : null} <span className="meta text-t3">({CANAIS[e.canal]})</span></>,
        }))} />
      </section>
      <p className="meta text-t2">Tarefas e organização de pessoas vêm do histórico das notas (desde o início); assistente, WhatsApp, apps de IA, exportações e conexões são registrados desde a v2.53. Nunca guardamos o conteúdo das mensagens.</p>
    </div>
  );
}
