import Chip from "@/components/ds/Chip";
import Tabela, { Sparkline } from "@/components/ds/padroes/Tabela";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EstadoVazio } from "@/components/ds/Estados";
import { getPessoas } from "@/lib/v2/data";
import { SECOES, usoPeriodo } from "@/lib/v2/uso";
import type { ModuloProps } from "./index";

const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
const diaBahia = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "America/Bahia" }).slice(0, 10);

/** Minutes of use per person and section (pages open and in use). Filters: ?dias ?pessoa */
export default function TempoUso({ q }: ModuloProps) {
  const dias = [7, 30, 90].includes(Number(q.dias)) ? Number(q.dias) : 30;
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const regs = usoPeriodo(dias).filter((r) => !q.pessoa || r.pessoa === q.pessoa);
  const ultimos14 = Array.from({ length: 14 }, (_, i) => diaBahia(new Date(Date.now() - (13 - i) * 86_400_000)));

  const porPessoa = [...new Set(regs.map((r) => r.pessoa))].map((id) => {
    const meus = regs.filter((r) => r.pessoa === id);
    const total = meus.reduce((s, r) => s + r.min, 0), diasAtivos = new Set(meus.map((r) => r.dia)).size;
    const secoes = Object.entries(meus.reduce<Record<string, number>>((a, r) => ({ ...a, [r.secao]: (a[r.secao] ?? 0) + r.min }), {})).sort((a, b) => b[1] - a[1]);
    return { id, total, diasAtivos, media: diasAtivos ? Math.round(total / diasAtivos) : 0, secoes, porDia: ultimos14.map((d) => meus.filter((r) => r.dia === d).reduce((s, r) => s + r.min, 0)) };
  });
  const porSecao = Object.entries(regs.reduce<Record<string, number>>((a, r) => ({ ...a, [r.secao]: (a[r.secao] ?? 0) + r.min }), {})).sort((a, b) => b[1] - a[1]);
  const totalSec = Math.max(1, porSecao.reduce((s, [, m]) => s + m, 0));
  const link = (mud: Record<string, string | undefined>) => `/controle?${new URLSearchParams(Object.entries({ m: "uso", dias: String(dias), pessoa: q.pessoa, ...mud }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => <Chip key={d} href={link({ dias: String(d) })} ativo={d === dias} icone="calendario">{`${d} dias`}</Chip>)}
        {q.pessoa && <Chip href={link({ pessoa: undefined })} icone="fechar">{nome(q.pessoa)}</Chip>}
      </div>

      <Tabela rotulo="Tempo de uso por pessoa" ordemInicial={{ id: "total", desc: true }} vazio={<EstadoVazio compacto selo="olho" titulo="Ainda sem medição no período (começou na v2.54)." />} colunas={[
        { id: "pessoa", rotulo: "Pessoa", ordenavel: true }, { id: "total", rotulo: "Total", numero: true, ordenavel: true }, { id: "dias", rotulo: "Dias ativos", numero: true, ordenavel: true },
        { id: "media", rotulo: "Média/dia", numero: true, ordenavel: true }, { id: "graf", rotulo: "14 dias" }, { id: "onde", rotulo: "Onde mais", soComputador: true },
      ]} linhas={porPessoa.map((p) => ({
        id: p.id, href: link({ pessoa: p.id }),
        valores: { pessoa: nome(p.id), total: p.total, dias: p.diasAtivos, media: p.media },
        celulas: {
          pessoa: nome(p.id), total: <b className="whitespace-nowrap font-semibold text-t1">{horas(p.total)}</b>, dias: p.diasAtivos, media: <span className="whitespace-nowrap">{horas(p.media)}</span>,
          graf: <Sparkline pontos={p.porDia} rotulo="minutos por dia, últimos 14 dias" />, onde: <span className="meta">{p.secoes.slice(0, 3).map(([s, m]) => `${SECOES[s] ?? s} ${horas(m)}`).join(" · ")}</span>,
        },
      }))} />

      {porSecao.length > 0 && (
        <section className="grid gap-3 rounded-cartao bg-s1 p-4">
          <h2 className="titulo-cartao">Por seção{q.pessoa ? ` · ${nome(q.pessoa)}` : ""}</h2>
          {porSecao.map(([s, m]) => (
            <div key={s} className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <span className="meta text-t2">{SECOES[s] ?? s}</span>
              <BarraProgresso valor={m} max={totalSec} variante="info" rotulo={horas(m)} rotuloAcessivel={SECOES[s] ?? s} />
            </div>
          ))}
        </section>
      )}
      <p className="meta text-t2">Conta 1 minuto por minuto com a página aberta, visível e com algum movimento nos últimos 2 minutos. Várias abas não contam em dobro. WhatsApp e apps de IA aparecem em Atividade.</p>
    </div>
  );
}
