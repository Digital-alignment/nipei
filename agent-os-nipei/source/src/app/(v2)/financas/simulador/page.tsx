import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao from "@/components/ds/Botao";
import Aviso from "@/components/ds/Aviso";
import Icone from "@/components/ds/Icone";
import Tabela from "@/components/ds/padroes/Tabela";
import { Section } from "@/components/v2/ui";
import { FiltroAuto } from "@/components/v2/AcervoForm";
import { currentUser, getLancamentos } from "@/lib/v2/data";
import { custoFixo, getFixos } from "@/lib/v2/fixos";
import { getT } from "@/lib/v2/i18n";
import { numBR } from "@/lib/v2/importarFinancas";
import { baseDoEvento, simular } from "@/lib/v2/simulador";

// Simulador de preço por retiro (DS 10.25, gestão). GET form: every simulation is a link, nothing is saved.
// The base event lives in its own form so changing it refills the numbers instead of keeping the typed ones.
export const dynamic = "force-dynamic";

const brl = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })}`;
const brl0 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
const campoBR = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

type Q = { base?: string; n?: string; preco?: string; fixo?: string; pp?: string; rateio?: string; margem?: string };

export default async function Simulador({ searchParams }: { searchParams: Promise<Q> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const q = await searchParams;
  const { t } = await getT();
  const lanc = getLancamentos();
  const eventos = [...new Set(lanc.filter((l) => l.evento && !l.anulado && l.tipo === "despesa").map((l) => l.evento))].sort();
  const base = q.base && eventos.includes(q.base) ? baseDoEvento(lanc, q.base) : null;
  const num = (v: string | undefined, padrao: number) => { const x = v == null || v === "" ? NaN : numBR(v); return Number.isFinite(x) ? Math.max(0, x) : padrao; };
  const e = {
    participantes: num(q.n, base?.participantes || 10), preco: num(q.preco, base?.precoMedio ?? 0), fixo: num(q.fixo, base?.fixo ?? 0),
    porPessoa: num(q.pp, base?.porPessoa ?? 0), rateio: num(q.rateio, 0), margem: Math.min(90, num(q.margem, 20)) / 100,
  };
  const r = simular(e);
  const mensal = custoFixo(getFixos()).despesas;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="mx-auto max-w-4xl">
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={t.simulador}
        acoes={<Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />
      <p className="corpo mb-4 max-w-2xl text-t2">{t.simuladorExplica}</p>

      <Cartao className="mb-6">
        <FiltroAuto className="max-w-sm">
          <Campo tipo="selecao" name="base" rotulo={t.comBaseEm} defaultValue={base?.evento ?? ""}>
            <option value="">{t.baseManual}</option>{eventos.map((v) => <option key={v} value={v}>{v}</option>)}
          </Campo>
        </FiltroAuto>
        {base && <p className="meta mt-2 text-t2">{base.participantes} {t.pagantes}; {t.baseExplica}</p>}
        <form className="mt-4 grid gap-3" key={JSON.stringify(q)}>
          {base && <input type="hidden" name="base" value={base.evento} />}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Campo name="n" rotulo={t.participantesLbl} inputMode="numeric" defaultValue={String(e.participantes)} />
            <Campo name="preco" rotulo={t.precoPessoa} inputMode="decimal" defaultValue={campoBR(e.preco)} />
            <Campo name="margem" rotulo={t.margemDesejada} inputMode="numeric" defaultValue={String(Math.round(e.margem * 100))} />
            <Campo name="fixo" rotulo={t.custoFixoEvento} inputMode="decimal" defaultValue={campoBR(e.fixo)} />
            <Campo name="pp" rotulo={t.custoPessoa} inputMode="decimal" defaultValue={campoBR(e.porPessoa)} />
            <Campo name="rateio" rotulo={t.rateioFixo} inputMode="decimal" defaultValue={campoBR(e.rateio)} ajuda={mensal ? `${t.rateioAjuda} ${brl0(mensal)}` : undefined} />
          </div>
          <div><Botao type="submit" icone="gerar-outra" variante="primario" tamanho="M">{t.simularBtn}</Botao></div>
        </form>
        {base && base.categorias.length > 0 && (
          <details className="mt-4 rounded-interno bg-s2">
            <summary className="anel-foco flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-interno px-3 font-texto text-sm font-semibold"><Icone nome="avancar" tamanho={16} />{t.custosBase}</summary>
            <div className="px-3 pb-3">
              <Tabela rotulo={t.custosBase} colunas={[{ id: "c", rotulo: t.categoria }, { id: "v", rotulo: t.valor, numero: true }, { id: "k", rotulo: t.contaComo }]}
                linhas={base.categorias.map((c) => ({ id: c.categoria, celulas: { c: c.categoria, v: brl(c.total), k: c.porPessoa ? t.porPessoaTxt : t.fixoTxt } }))} />
            </div>
          </details>
        )}
      </Cartao>

      {r.equilibrio == null ? <Aviso estado="atencao" className="mb-4" titulo={t.semEquilibrio} />
        : r.precoMinimo != null && e.preco < r.precoMinimo && (
          <Aviso estado="atencao" className="mb-4" titulo={e.participantes < r.equilibrio ? `${t.abaixoEquilibrio} ${r.equilibrio} ${t.participantesN}.` : t.abaixoMinimo} />
        )}

      <div className="mb-8 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Cartao variante="kpi"><span className="meta text-t2">{t.resultado}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums ${r.resultado < 0 ? "text-err" : "text-ok"}`}>{brl0(r.resultado)}</span></Cartao>
        <Cartao variante="kpi"><span className="meta text-t2">{t.margemLbl}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums ${r.margemReal < 0 ? "text-err" : ""}`}>{pct(r.margemReal)}</span></Cartao>
        <Cartao variante="kpi"><span className="meta text-t2">{t.equilibrioLbl}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{r.equilibrio ?? "—"}</span><span className="meta text-t3">{t.participantesN}</span></Cartao>
        <Cartao variante="kpi"><span className="meta text-t2">{t.precoMinimo}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{r.precoMinimo == null ? "—" : brl0(r.precoMinimo)}</span></Cartao>
        <Cartao variante="destaque" className="col-span-2 lg:col-span-1">
          <span className="meta opacity-80">{t.precoSugeridoPara} {pct(e.margem)} {t.deMargem}</span>
          <span className="font-display text-2xl font-extralight leading-none tabular-nums">{r.precoSugerido == null ? "—" : brl(r.precoSugerido)}</span>
          {r.precoSugeridoRedondo != null && <span className="meta opacity-80">{t.arredondadoPara} {brl0(r.precoSugeridoRedondo)}</span>}
        </Cartao>
      </div>

      <Section title={t.cenarios}>
        <Tabela rotulo={t.cenarios} colunas={[
          { id: "n", rotulo: t.participantesLbl, numero: true }, { id: "rec", rotulo: t.receitaLbl, numero: true }, { id: "cus", rotulo: t.custoLbl, numero: true }, { id: "res", rotulo: t.resultado, numero: true },
        ]} linhas={r.cenarios.map((c) => {
          const b = c.simulado ? "font-semibold text-t1" : "";
          return { id: String(c.participantes), celulas: {
            n: <span className={`inline-flex items-center gap-2 ${b}`}>{c.participantes}{c.simulado && <span className="meta text-t3">{t.simuladoLbl}</span>}{c.equilibrio && <span className="meta text-t3">{t.equilibrioCurto}</span>}</span>,
            rec: <span className={b}>{brl0(c.receita)}</span>, cus: <span className={b}>{brl0(c.custo)}</span>,
            res: <span className={`${b} ${c.resultado < 0 ? "text-err" : "text-ok"}`}>{brl0(c.resultado)}</span>,
          } };
        })} />
      </Section>
    </div>
  );
}
