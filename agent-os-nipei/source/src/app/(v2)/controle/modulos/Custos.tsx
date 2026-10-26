import Chip from "@/components/ds/Chip";
import Botao from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import Tabela from "@/components/ds/padroes/Tabela";
import { EstadoVazio } from "@/components/ds/Estados";
import { getPessoas } from "@/lib/v2/data";
import { custosDoMes, mesesComCusto, ORIGENS, type CustoIA } from "@/lib/v2/custosIA";
import type { ModuloProps } from "./index";

const usd = (v: number) => `US$ ${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
const tok = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

type Soma = { n: number; tin: number; tout: number; usd: number; semPreco: number; pessoal: number };
function somar(cs: CustoIA[]): Soma {
  return cs.reduce<Soma>((s, c) => ({ n: s.n + 1, tin: s.tin + c.tin, tout: s.tout + c.tout, usd: s.usd + (c.pessoal ? 0 : c.usd ?? 0), semPreco: s.semPreco + (!c.pessoal && c.usd === null ? 1 : 0), pessoal: s.pessoal + (c.pessoal ? 1 : 0) }), { n: 0, tin: 0, tout: 0, usd: 0, semPreco: 0, pessoal: 0 });
}
function agrupar(cs: CustoIA[], chave: (c: CustoIA) => string) {
  const g = new Map<string, CustoIA[]>();
  for (const c of cs) g.set(chave(c), [...(g.get(chave(c)) ?? []), c]);
  return [...g.entries()].map(([k, v]) => ({ k, ...somar(v) }));
}

/** AI calls and cost per month, person, use and model. Filter: ?mes=AAAA-MM */
export default function Custos({ q }: ModuloProps) {
  const atual = new Date().toISOString().slice(0, 7);
  const meses = [...new Set([atual, ...mesesComCusto()])].sort().reverse();
  const mes = meses.includes(q.mes ?? "") ? q.mes! : atual;
  const cs = custosDoMes(mes), t = somar(cs);
  const ps = getPessoas(), nome = (id: string) => (id ? ps.find((p) => p.id === id || p.usuario === id)?.name.split(" (")[0] ?? id : "Tarefas automáticas");
  const tabela = (titulo: string, linhas: ReturnType<typeof agrupar>, rotulo: (k: string) => string) => (
    <Tabela rotulo={titulo} ordemInicial={{ id: "usd", desc: true }} vazio={<EstadoVazio compacto selo="olho" titulo="Nenhuma chamada de IA registrada neste mês (a medição começou na v2.56)." />} colunas={[
      { id: "k", rotulo: titulo, ordenavel: true }, { id: "n", rotulo: "Chamadas", numero: true, ordenavel: true },
      { id: "tok", rotulo: "Tokens (entrada / saída)", numero: true, ordenavel: true }, { id: "usd", rotulo: "Custo da plataforma", numero: true, ordenavel: true },
    ]} linhas={linhas.map((l) => ({
      id: l.k, valores: { k: rotulo(l.k), n: l.n, tok: l.tin + l.tout, usd: l.usd },
      celulas: {
        k: rotulo(l.k), n: <>{l.n}{l.pessoal ? <span className="meta text-t3"> ({l.pessoal} chave própria)</span> : null}</>,
        tok: <span className="whitespace-nowrap">{tok(l.tin)} / {tok(l.tout)}</span>,
        usd: <span className="whitespace-nowrap font-semibold text-t1">{usd(l.usd)}{l.semPreco ? <span className="meta font-normal text-t3"> + {l.semPreco} sem preço</span> : null}</span>,
      },
    }))} />
  );

  return (
    <div className="grid gap-6">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {meses.slice(0, 12).map((m) => <Chip key={m} href={`/controle?m=custos&mes=${m}`} ativo={m === mes} icone="calendario">{m}</Chip>)}
        <span className="ml-auto shrink-0"><Botao href={`/controle/exportar?r=custos&mes=${mes}`} variante="tonal" tamanho="P" icone="baixar">CSV do mês</Botao></span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[["Custo da plataforma", usd(t.usd)], ["Chamadas", String(t.n)], ["Tokens de entrada", tok(t.tin)], ["Tokens de saída", tok(t.tout)]].map(([r, v]) => (
          <Cartao key={r} variante="kpi"><span className="meta text-t2">{r}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums md:text-3xl">{v}</span></Cartao>
        ))}
      </div>
      <p className="meta text-t2">O custo em dólar vem do OpenRouter (a chave da plataforma). A voz e a transcrição usam o Gemini da plataforma, que informa só os tokens (“sem preço”). Quem usa a própria chave paga direto ao provedor — aparece nas chamadas, não no custo.</p>
      {tabela("Pessoa", agrupar(cs, (c) => c.pessoa), nome)}
      <div className="grid gap-6 lg:grid-cols-2">
        {tabela("Uso", agrupar(cs, (c) => c.origem), (k) => ORIGENS[k] ?? k)}
        {tabela("Modelo", agrupar(cs, (c) => `${c.provedor === "plataforma" ? "OpenRouter" : c.provedor} · ${c.modelo}`), (k) => k)}
      </div>
    </div>
  );
}
