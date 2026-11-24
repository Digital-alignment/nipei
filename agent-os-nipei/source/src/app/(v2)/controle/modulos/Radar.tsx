import Chip from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import Tabela from "@/components/ds/padroes/Tabela";
import { EstadoVazio } from "@/components/ds/Estados";
import { getPessoas } from "@/lib/v2/data";
import { eventosDesde } from "@/lib/v2/eventos";
import type { ModuloProps } from "./index";

// How the Radar is used (DS 10.29): the "radar" events (kind of action only, never titles), to pick phase 3 with data.
const ACOES: Record<string, string> = {
  abriu: "Abriu o Radar", concluiu: "Concluiu", adiou: "Adiou", passo: "Marcou um passo", foco: "Mexeu no foco",
  "sugestão": "Tocou uma sugestão do Pinu", pergunta: "Perguntou no cartão", confirmou: "Confirmou propostas", cancelou: "Cancelou propostas",
  "fazer por mim": "Pediu Fazer por mim", fechou: "Fechou o Radar",
};
const SUGESTOES: Record<string, string> = { resposta: "Redigir resposta", arquivo: "Achar o arquivo", mensagem: "Escrever mensagem", passos: "Dividir em passos", planejar: "Planejar" };

export default function Radar({ q }: ModuloProps) {
  const dias = ["7", "30", "90"].includes(q.dias ?? "") ? Number(q.dias) : 30;
  const evs = eventosDesde(dias).filter((e) => e.tipo === "radar").map((e) => {
    const [acao, ...resto] = e.detalhe.split(" · ");
    return { ...e, acao, extra: resto.join(" · ") };
  });
  const ps = getPessoas(), nome = (id: string) => ps.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const conta = (f: (e: (typeof evs)[number]) => boolean) => evs.filter(f).length;
  const porAcao = Object.keys(ACOES).map((a) => ({ a, n: conta((e) => e.acao === a) })).filter((x) => x.n);
  const porSugestao = Object.keys(SUGESTOES).map((s) => ({ s, n: conta((e) => e.acao === "sugestão" && e.extra === s) }));
  const adiou = ["amanha", "proxima semana", "outra data"].map((x) => `${x.replace("amanha", "amanhã").replace("proxima", "próxima")} ${conta((e) => e.acao === "adiou" && e.extra === x)}`).join(" · ");
  // a pass = from "abriu" to "fechou": cards seen and what happened to them
  const fechadas = evs.filter((e) => e.acao === "fechou").map((e) => (e.extra.match(/\d+/g) ?? []).map(Number));
  const soma = (i: number) => fechadas.reduce((n, x) => n + (x[i] ?? 0), 0);
  const pessoas = [...new Set(evs.map((e) => e.pessoa))];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => <Chip key={d} href={`/controle?m=radar&dias=${d}`} ativo={d === dias} icone="calendario">{d} dias</Chip>)}
      </div>
      <p className="meta text-t2">Medido desde 24/11/2026: cada ação no Radar de Hoje (só o tipo, nunca o título da tarefa). Serve para escolher o que entra na fase 3 (eventos, pedidos, entregas do Hermes, comentários, fatos).</p>
      {!evs.length ? <EstadoVazio compacto selo="olho" titulo="Ninguém usou o Radar neste período." /> : (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[["Aberturas", String(conta((e) => e.acao === "abriu"))], ["Pessoas", String(pessoas.length)],
              ["Concluídas pelo Radar", String(conta((e) => e.acao === "concluiu"))], ["Perguntas ao Pinu no cartão", String(conta((e) => e.acao === "sugestão" || e.acao === "pergunta"))]].map(([rot, v]) => (
              <Cartao key={rot} variante="kpi"><span className="meta text-t2">{rot}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{v}</span></Cartao>
            ))}
          </div>
          {fechadas.length > 0 && (
            <p className="corpo text-t2">Em {fechadas.length} {fechadas.length === 1 ? "passada" : "passadas"} até o fim: {soma(0)} concluídas, {soma(1)} adiadas e {soma(2)} cartões sem mexer. Adiamentos: {adiou}.</p>
          )}
          <Tabela rotulo="O que fazem no Radar" ordemInicial={{ id: "n", desc: true }} colunas={[{ id: "a", rotulo: "Ação", ordenavel: true }, { id: "n", rotulo: "Vezes", numero: true, ordenavel: true }]}
            linhas={porAcao.map((x) => ({ id: x.a, valores: { a: ACOES[x.a], n: x.n }, celulas: { a: ACOES[x.a], n: x.n } }))} />
          <Tabela rotulo="Sugestões do Pinu tocadas" ordemInicial={{ id: "n", desc: true }} colunas={[{ id: "s", rotulo: "Sugestão", ordenavel: true }, { id: "n", rotulo: "Toques", numero: true, ordenavel: true }]}
            linhas={porSugestao.map((x) => ({ id: x.s, valores: { s: SUGESTOES[x.s], n: x.n }, celulas: { s: SUGESTOES[x.s], n: x.n } }))} />
          <Tabela rotulo="Por pessoa" ordemInicial={{ id: "ab", desc: true }} colunas={[
            { id: "p", rotulo: "Pessoa", ordenavel: true }, { id: "ab", rotulo: "Aberturas", numero: true, ordenavel: true },
            { id: "c", rotulo: "Concluídas", numero: true, ordenavel: true }, { id: "ad", rotulo: "Adiadas", numero: true, ordenavel: true },
            { id: "pi", rotulo: "Pinu no cartão", numero: true, ordenavel: true }, { id: "h", rotulo: "Fazer por mim", numero: true, ordenavel: true },
          ]} linhas={pessoas.map((id) => {
            const de = (a: string | string[]) => conta((e) => e.pessoa === id && (Array.isArray(a) ? a.includes(e.acao) : e.acao === a));
            const v = { p: nome(id), ab: de("abriu"), c: de("concluiu"), ad: de("adiou"), pi: de(["sugestão", "pergunta"]), h: de("fazer por mim") };
            return { id, valores: v, celulas: v };
          })} />
        </>
      )}
    </div>
  );
}
