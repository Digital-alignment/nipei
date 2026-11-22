import Chip from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import Tabela from "@/components/ds/padroes/Tabela";
import { EstadoVazio } from "@/components/ds/Estados";
import { getPessoas } from "@/lib/v2/data";
import { eventosDesde } from "@/lib/v2/eventos";
import { resumoSugestoes } from "@/lib/v2/sugestaoTarefa";
import type { ModuloProps } from "./index";

const NOMES: Record<string, string> = { equipe: "equipe", prazo: "prazo", prioridade: "prioridade", responsaveis: "responsáveis", projeto: "projeto" };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/** Does the Pinu's suggestion help? Shown, asked again, used, and what was kept until creating. Filter: ?dias=7|30|90 */
export default function SugestoesPinu({ q }: ModuloProps) {
  const dias = ["7", "30", "90"].includes(q.dias ?? "") ? Number(q.dias) : 30;
  const evs = eventosDesde(dias);
  const r = resumoSugestoes(evs);
  // conversations with the Pinu panel: answers and 👍/👎 (DS 10.11); the detail carries the tools it read, never the text
  const conversas = evs.filter((e) => e.tipo === "usou o assistente").length;
  const notas = evs.filter((e) => e.tipo === "avaliou o Pinu");
  const uteis = notas.filter((e) => e.detalhe.startsWith("útil")).length, ruins = notas.filter((e) => !e.detalhe.startsWith("útil"));
  const ps = getPessoas(), nome = (id: string) => ps.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const vazio = !r.porPessoa.size;

  const bloco = (titulo: string, c: (typeof r.porTipo)["tarefa"]) => {
    const mostradas = c.mostrou + c.outra;
    const mudados = Object.entries(c.mudou).sort((a, b) => b[1] - a[1]);
    return (
      <section className="grid gap-3">
        <h3 className="titulo-secao">{titulo}</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[["Sugestões mostradas", String(mostradas)], ["Usadas (✓)", `${c.usou} · ${pct(c.usou, mostradas)}`], ["Criadas com a sugestão", String(c.criou)], ["Campos mantidos", `${c.mantidos}/${c.campos} · ${pct(c.mantidos, c.campos)}`]].map(([rot, v]) => (
            <Cartao key={rot} variante="kpi"><span className="meta text-t2">{rot}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{v}</span></Cartao>
          ))}
        </div>
        <p className="meta text-t2">
          {c.outra ? `Pediram outra ${c.outra} ${c.outra === 1 ? "vez" : "vezes"}. ` : ""}
          {mudados.length ? `O que mais mudaram depois de usar: ${mudados.map(([k, n]) => `${NOMES[k] ?? k} (${n})`).join(", ")}.` : c.criou ? "Ninguém mudou o que o Pinu preencheu." : ""}
        </p>
      </section>
    );
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => <Chip key={d} href={`/controle?m=pinu&dias=${d}`} ativo={d === dias} icone="calendario">{d} dias</Chip>)}
      </div>
      <p className="meta text-t2">Medido desde a v2.109: cada sugestão mostrada, cada ✓ e, ao criar, quantos campos preenchidos pelo Pinu a pessoa manteve. O texto das tarefas não é guardado. Para o Pinu acertar a equipe, cada equipe precisa do Sobre escrito (Equipes → Sobre).</p>
      <section className="grid gap-3">
        <h3 className="titulo-secao">Conversas com o Pinu</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[["Respostas", String(conversas)], ["Avaliadas", `${notas.length} · ${pct(notas.length, conversas)}`], ["Úteis", `${uteis} · ${pct(uteis, notas.length)}`], ["Não ajudaram", String(ruins.length)]].map(([rot, v]) => (
            <Cartao key={rot} variante="kpi"><span className="meta text-t2">{rot}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{v}</span></Cartao>
          ))}
        </div>
        {ruins.length > 0 && (
          <Tabela rotulo="Respostas que não ajudaram" colunas={[{ id: "d", rotulo: "Quando" }, { id: "p", rotulo: "Pessoa" }, { id: "f", rotulo: "O que o Pinu consultou" }]}
            linhas={ruins.slice(-20).reverse().map((e, i) => ({ id: String(i), valores: { d: e.em, p: nome(e.pessoa), f: e.detalhe }, celulas: { d: new Date(e.em).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }), p: nome(e.pessoa), f: e.detalhe.replace(/^não ajudou · /, "") } }))} />
        )}
      </section>
      {vazio ? <EstadoVazio compacto selo="olho" titulo="Nenhuma sugestão do Pinu neste período." /> : (
        <>
          {bloco("Nova tarefa", r.porTipo.tarefa)}
          {bloco("Pedidos", r.porTipo.pedido)}
          <Tabela rotulo="Por pessoa" ordemInicial={{ id: "m", desc: true }} colunas={[
            { id: "p", rotulo: "Pessoa", ordenavel: true }, { id: "m", rotulo: "Mostradas", numero: true, ordenavel: true },
            { id: "u", rotulo: "Usadas", numero: true, ordenavel: true }, { id: "c", rotulo: "Criadas com a sugestão", numero: true, ordenavel: true },
          ]} linhas={[...r.porPessoa.entries()].map(([id, c]) => ({
            id, valores: { p: nome(id), m: c.mostrou + c.outra, u: c.usou, c: c.criou },
            celulas: { p: nome(id), m: c.mostrou + c.outra, u: <>{c.usou} <span className="meta text-t3">{pct(c.usou, c.mostrou + c.outra)}</span></>, c: c.criou },
          }))} />
        </>
      )}
    </div>
  );
}
