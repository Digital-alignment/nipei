import { notFound, redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import Aviso from "@/components/ds/Aviso";
import Tabela from "@/components/ds/padroes/Tabela";
import { ToastAoAbrir } from "@/components/ds/Toast";
import { Section } from "@/components/v2/ui";
import { currentUser, getLancamentos } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { norm } from "@/lib/v2/simulador";
import { compararEvento, orcamentoDoEvento, realDoEvento } from "@/lib/v2/orcamentoEvento";
import { podeFinancas } from "@/lib/v2/funcoes";

// Evento financeiro (DS 10.25, gestão): budget × actual (when the simulator saved one), costs by category, participants.
export const dynamic = "force-dynamic";

const brl0 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
const mais = (v: number) => (v > 0 ? `+${brl0(v)}` : brl0(v));

export default async function EventoFinanceiro({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const lanc = getLancamentos();
  const orc = q.e ? orcamentoDoEvento(q.e) : undefined;
  const nome = lanc.find((l) => l.evento && !l.anulado && norm(l.evento) === norm(q.e ?? ""))?.evento ?? orc?.evento;
  if (!nome) notFound();
  const real = realDoEvento(lanc, nome);
  const comp = orc ? compararEvento(orc, lanc) : [];
  const res = comp.find((l) => l.id === (orc && orc.rateio > 0 ? "depoisRateio" : "resultado"));
  const temDespesas = real.categorias.length > 0;
  const simular = orc
    ? `/financas/simulador?${new URLSearchParams({ ...(temDespesas ? { base: nome } : {}), evento: nome, n: String(orc.participantes), preco: String(orc.preco).replace(".", ","), fixo: String(orc.fixo).replace(".", ","), pp: String(orc.porPessoa).replace(".", ","), rateio: String(orc.rateio).replace(".", ","), margem: String(Math.round(orc.margem * 100)) })}`
    : `/financas/simulador?${new URLSearchParams(temDespesas ? { base: nome } : { evento: nome })}`;
  const valor = (id: string, v: number) => (id === "participantes" ? String(v) : brl0(v));

  return (
    <div className="mx-auto max-w-4xl">
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={nome}
        subtitulo={<>{real.participantes.length} {t.pagantesN} · {real.n} {t.lancamentosN}</>}
        acoes={<div className="flex flex-wrap gap-2"><Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao><Botao href={simular} icone="gerar-outra" variante="fantasma" tamanho="M">{t.simularPreco}</Botao></div>} />
      <ToastAoAbrir texto={q.ok} />

      {!orc ? (
        <Aviso estado="info" className="mb-6" titulo={t.semOrcamentoEvento} mensagem={t.semOrcamentoExplica}
          acoes={<Botao href={simular} icone="gerar-outra" variante="tonal" tamanho="M">{t.criarNoSimulador}</Botao>} />
      ) : (
        <Section title={t.orcadoRealizado}>
          {res?.pior && <Aviso estado="atencao" className="mb-3" titulo={t.abaixoDoOrcado} />}
          <Tabela rotulo={t.orcadoRealizado} colunas={[
            { id: "l", rotulo: t.linhaLbl }, { id: "o", rotulo: t.orcadoLbl, numero: true }, { id: "r", rotulo: t.realizadoLbl, numero: true },
            { id: "p", rotulo: t.pendenteLbl, numero: true }, { id: "d", rotulo: t.diferencaLbl, numero: true },
          ]} linhas={comp.map((l) => ({ id: l.id, celulas: {
            l: <span className={l.id.startsWith("resultado") || l.id === "depoisRateio" ? "font-semibold text-t1" : ""}>{t.linhasOrc[l.id]}</span>,
            o: valor(l.id, l.orcado), r: valor(l.id, l.real), p: l.pendente ? valor(l.id, l.pendente) : "—",
            d: <span className={l.pior ? "text-err" : l.melhor ? "text-ok" : "text-t2"}>{l.id === "participantes" ? (l.diferenca > 0 ? `+${l.diferenca}` : String(l.diferenca)) : mais(l.diferenca)}</span>,
          } }))} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="meta text-t3">{t.orcamentoSalvoPor} {orc.salvoPor} · {fmtDate(orc.salvoEm, lang)}</p>
            <Botao href={simular} icone="editar" variante="fantasma" tamanho="M">{t.editarNoSimulador}</Botao>
          </div>
        </Section>
      )}

      {temDespesas && (
        <Section title={t.despesasPorCategoria}>
          <Tabela rotulo={t.despesasPorCategoria} colunas={[{ id: "c", rotulo: t.categoria }, { id: "k", rotulo: t.contaComo }, { id: "p", rotulo: t.pagoLbl, numero: true }, { id: "a", rotulo: t.aPagarLbl, numero: true }]}
            linhas={real.categorias.map((c) => ({ id: c.categoria, celulas: { c: c.categoria, k: c.porPessoa ? t.porPessoaTxt : t.fixoTxt, p: brl0(c.pago), a: c.aPagar ? <span className="text-warn">{brl0(c.aPagar)}</span> : "—" } }))} />
        </Section>
      )}

      {real.participantes.length > 0 && (
        <Section title={t.participantesTitulo} count={real.participantes.length}>
          <Tabela rotulo={t.participantesTitulo} colunas={[{ id: "n", rotulo: t.nomeLbl }, { id: "p", rotulo: t.pagoLbl, numero: true }, { id: "a", rotulo: t.aReceberLbl, numero: true }]}
            linhas={real.participantes.map((p) => ({ id: p.participante, celulas: { n: p.participante, p: brl0(p.pago), a: p.aReceber ? <span className="text-warn">{brl0(p.aReceber)}</span> : "—" } }))} />
        </Section>
      )}
    </div>
  );
}
