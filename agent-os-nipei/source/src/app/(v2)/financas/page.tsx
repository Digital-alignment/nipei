import Link from "next/link";
import { EstadoVazio } from "@/components/ds/Estados";
import Icone from "@/components/ds/Icone";
import { redirect } from "next/navigation";
import { Section } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";
import Tabela, { Sparkline } from "@/components/ds/padroes/Tabela";
import { BadgeEstado } from "@/components/ds/Chip";
import { Interruptor } from "@/components/ds/Controles";
import { CATEGORIAS, currentUser, getContas, getEquipes, getLancamentos, getPessoas, getProjetos, today } from "@/lib/v2/data";
import { resumoContas } from "@/lib/v2/contas";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { resumoFinanceiro } from "@/lib/v2/diagnostico";
import { quandoImportacao } from "@/lib/v2/importarFinancas";
import { gerarFixos, getFixos, previsaoCaixa } from "@/lib/v2/fixos";
import Aviso from "@/components/ds/Aviso";
import Botao from "@/components/ds/Botao";
import { ToastAoAbrir } from "@/components/ds/Toast";
import EnviarComConfirmacao from "@/components/v2/EnviarComConfirmacao";
import ExportarGoogle from "@/components/v2/ExportarGoogle";
import { anularLancamentoAction, createLancamentoAction, desfazerImportacaoAction, quitarLancamentoAction } from "../actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// KPIs: whole reais, so the number never gets cut in 2 columns (cents stay in the list)
const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

function Bar({ label, value, max, cls }: { label: string; value: number; max: number; cls: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
      <span className="meta truncate text-t2">{label}</span>
      <div className="h-2 overflow-hidden rounded-pilula bg-s2"><div className={`h-full rounded-pilula ${cls}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
      <span className="meta tabular-nums text-t1">{brl(value)}</span>
    </div>
  );
}

export default async function Financas({ searchParams }: { searchParams: Promise<{ m?: string; ok?: string }> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7);
  gerarFixos(); // this month's fixed costs as pending entries (once a day)
  const todos = getLancamentos();
  const prev = previsaoCaixa(todos, getFixos(), hoje);
  const contas = getContas(), contasAtivas = contas.filter((c) => c.ativa);
  const saldos = resumoContas(contasAtivas, todos, hoje).contas;
  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? "";
  // pending ("a pagar" / "a receber") entries stay out of every total until they are paid
  const validos = todos.filter((l) => !l.anulado && !l.pendente);
  const pendentes = todos.filter((l) => !l.anulado && l.pendente).sort((a, b) => a.data.localeCompare(b.data));
  const rotPend = (tipo: string) => (tipo === "entrada" ? t.aReceber : t.aPagar);
  // per event, every month (a retreat crosses months); also the suggestions of the "Evento" field
  const porEvento = resumoFinanceiro(todos.filter((l) => !l.anulado)).porEvento.filter((x) => x.evento);
  // spreadsheet imports with entries still valid, newest first (each one can be undone at once)
  const importacoes = Object.entries(todos.filter((l) => l.importacao && !l.anulado).reduce<Record<string, number>>((a, l) => ({ ...a, [l.importacao]: (a[l.importacao] ?? 0) + 1 }), {}))
    .sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
  const soma = (ls: typeof validos, tipo: "entrada" | "despesa") => ls.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);
  const doMes = validos.filter((l) => l.data.startsWith(mes));
  const entradas = soma(doMes, "entrada"), despesas = soma(doMes, "despesa");
  const ate = validos.filter((l) => l.data.slice(0, 7) <= mes);
  const saldoTotal = soma(ate, "entrada") - soma(ate, "despesa");

  const projetos = getProjetos(), equipes = getEquipes(), pessoas = getPessoas();
  const porCategoria = Object.entries(doMes.filter((l) => l.tipo === "despesa").reduce<Record<string, number>>((a, l) => ({ ...a, [l.categoria]: (a[l.categoria] ?? 0) + l.valor }), {}))
    .sort((a, b) => b[1] - a[1]);
  const porProjeto = [...new Set(doMes.map((l) => l.projeto))].map((p) => ({
    nome: projetos.find((x) => x.id === p)?.nome ?? t.geral,
    e: soma(doMes.filter((l) => l.projeto === p), "entrada"), d: soma(doMes.filter((l) => l.projeto === p), "despesa"),
  }));
  const meses = Array.from({ length: 6 }, (_, i) => addMonths(mes, i - 5)).map((m) => {
    const ls = validos.filter((l) => l.data.startsWith(m));
    return { m, e: soma(ls, "entrada"), d: soma(ls, "despesa") };
  });
  const maxMes = Math.max(1, ...meses.flatMap((x) => [x.e, x.d]));
  const lista = todos.filter((l) => l.data.startsWith(mes));
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" ")[0] ?? id;

  return (
    <>
      <CabecalhoPagina selo="semente" rotulo={t.gestaoLbl} titulo={t.financas}
        acoes={<div className="flex flex-wrap gap-2"><Botao href="/financas/contas" icone="abrir" variante="fantasma" tamanho="M">{t.contas}</Botao><Botao href="/financas/fixos" icone="calendario" variante="fantasma" tamanho="M">{t.gastosFixos}</Botao><Botao href="/financas/importar" icone="mais" variante="fantasma" tamanho="M">{t.importarPlanilha}</Botao><ExportarGoogle pessoaId={me.pessoa?.id} t={t} campos={{ tipo: "financas" }} formatos={[{ formato: "sheet", label: t.cx.exportarSheet }]} /></div>} />
      <ToastAoAbrir texto={q.ok} />
      {importacoes.length > 0 && (
        <ul className="mb-4 grid gap-1">
          {importacoes.map(([id, n]) => (
            <li key={id} className="flex flex-wrap items-center gap-2">
              <span className="meta text-t2">{t.importacaoDe} {fmtDate(quandoImportacao(id).slice(0, 10), lang)} · {n} {n === 1 ? t.lancamentoMin : t.lancamentosMin}</span>
              <form action={desfazerImportacaoAction}><input type="hidden" name="importacao" value={id} />
                <EnviarComConfirmacao icone="voltar" variante="fantasma" perigoso confirmarRotulo={t.desfazer} textoCarregando="…"
                  pergunta={`${t.desfazer}: ${n} ${t.lancamentosMin}?`} mensagem={t.desfazerExplica}>{t.desfazer}</EnviarComConfirmacao></form>
            </li>
          ))}
        </ul>
      )}
      <div className="mb-4 flex items-center justify-between">
        <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={`/financas?m=${addMonths(mes, -1)}`} />
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <p className="titulo-secao first-letter:uppercase">{fmtDate(mes, lang)}</p>
          <Botao href={`/financas/relatorio?m=${mes}`} icone="baixar" variante="fantasma" tamanho="M">{t.relatorioMes}</Botao>
        </div>
        <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={`/financas?m=${addMonths(mes, 1)}`} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {/* valores em reais são longos: número display menor que o padrão do KPI para caber em 2 colunas no celular */}
        {[[t.entradas, brl0(entradas), "text-ok", meses.map((x) => x.e)], [t.despesas, brl0(despesas), "text-err", meses.map((x) => x.d)], [t.saldoMes, brl0(entradas - despesas), "text-t1", meses.map((x) => x.e - x.d)]].map(([rot, v, cor, pts]) => (
          <Cartao key={rot as string} variante="kpi">
            <span className="meta text-t2">{rot as string}</span>
            <span className={`font-display text-2xl font-extralight leading-none tabular-nums md:text-3xl ${cor}`}>{v as string}</span>
            <Sparkline pontos={pts as number[]} rotulo={rot as string} />
          </Cartao>
        ))}
        {/* o único destaque da tela: o saldo acumulado */}
        <Cartao variante="destaque"><span className="meta opacity-80">{t.saldoTotal}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums md:text-3xl">{brl0(saldoTotal)}</span></Cartao>
      </div>

      <Section title={t.previsaoCaixa}>
        {prev.negativo && <Aviso estado="atencao" className="mb-3" titulo={`${t.caixaNegativo} ${fmtDate(prev.negativo.data, lang)} (${brl0(prev.negativo.saldo)})`} />}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <Cartao variante="kpi"><span className="meta text-t2">{t.hojeLbl}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums md:text-3xl ${prev.hoje < 0 ? "text-err" : ""}`}>{brl0(prev.hoje)}</span></Cartao>
          {prev.temFuturo && prev.janelas.map((j) => (
            <Cartao key={j.dias} variante="kpi">
              <span className="meta text-t2">{j.dias === 30 ? t.em30 : t.em60}</span>
              <span className={`font-display text-2xl font-extralight leading-none tabular-nums md:text-3xl ${j.saldo < 0 ? "text-err" : ""}`}>{brl0(j.saldo)}</span>
              <span className="meta text-t3">+{brl0(j.aReceber)} {t.aReceberMin} · −{brl0(j.aPagar)} {t.aPagarMin} · −{brl0(j.fixos)} {t.fixosMin}</span>
            </Cartao>
          ))}
        </div>
      </Section>

      {saldos.length > 0 && (
        <Section title={t.contas}>
          <ul className="grid gap-1">
            {saldos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-interno bg-s1 px-3 py-2">
                <span className="corpo text-t1">{c.nome} <span className="meta text-t3">· {t.tiposConta[c.tipo]}</span></span>
                <span className={`font-semibold tabular-nums ${c.saldo < 0 ? "text-err" : "text-t1"}`}>{brl(c.saldo)}</span>
              </li>
            ))}
          </ul>
          <Link href="/financas/contas" className="meta mt-2 inline-block text-t2 underline">{t.gerenciarContas}</Link>
        </Section>
      )}

      <details className="mb-7 rounded-cartao bg-s1">
        <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="mais" tamanho={18} />{t.novoLancamento}</summary>
        <form action={createLancamentoAction} className="grid gap-3 px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {([["despesa", t.despesa], ["entrada", t.entrada]] as const).map(([v, rot]) => (
              <label key={v} className="anel-foco inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                <input type="radio" name="tipo" value={v} defaultChecked={v === "despesa"} className="sr-only" /><Icone nome={v === "entrada" ? "mais" : "baixar"} tamanho={16} />{rot}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="data" name="data" rotulo={t.data} defaultValue={hoje} required />
            <Campo name="valor" rotulo={t.valor} inputMode="decimal" placeholder="0,00" required />
          </div>
          <Campo tipo="selecao" name="categoria" rotulo={t.categoria}>
            <optgroup label={t.despesas}>{CATEGORIAS.despesa.map((c) => <option key={c}>{c}</option>)}</optgroup>
            <optgroup label={t.entradas}>{CATEGORIAS.entrada.map((c) => <option key={c}>{c}</option>)}</optgroup>
          </Campo>
          <Campo name="descricao" rotulo={t.descricao} maxLength={200} />
          <div className="grid grid-cols-2 gap-3">
            <Campo name="evento" rotulo={t.eventoFin} list="eventos-fin" maxLength={80} placeholder={t.eventoFinEx} />
            <Campo name="participante" rotulo={t.participante} maxLength={80} />
          </div>
          <datalist id="eventos-fin">{porEvento.map((x) => <option key={x.evento} value={x.evento} />)}</datalist>
          <label className="flex min-h-11 items-center justify-between gap-3 font-texto text-sm text-t1">{t.aindaNaoPago}<Interruptor name="pendente" rotulo={t.aindaNaoPago} /></label>
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="selecao" name="projeto" rotulo={t.projeto}><option value="">{t.geral}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
            <Campo tipo="selecao" name="equipe" rotulo={t.equipe}><option value="">{t.nenhum}</option>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Campo>
          </div>
          {contasAtivas.length > 0 && <Campo tipo="selecao" name="conta" rotulo={t.contaLbl} defaultValue={""}><option value="">—</option>{contasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Campo>}
          <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.salvar}</BotaoEnviar></div>
        </form>
      </details>

      {pendentes.length > 0 && (
        <Section title={t.pendentes} count={pendentes.length}>
          <ul className="grid gap-2">
            {pendentes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-interno bg-s1 px-3 py-2">
                <span className="meta tabular-nums text-t3">{fmtDate(l.data, lang)}</span>
                <span className="corpo min-w-0 flex-1 text-t1"><Link href={`/financas/${encodeURIComponent(l.id)}`} className="anel-foco rounded-interno hover:underline">{l.descricao || l.categoria}</Link>{l.participante && <span className="meta text-t3"> · {l.participante}</span>}{l.evento && <span className="meta text-t3"> · {l.evento}</span>}</span>
                <span className={`font-semibold tabular-nums ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>
                <form action={quitarLancamentoAction}><input type="hidden" name="id" value={l.id} /><BotaoEnviar enviando="…" icone="confirmar" variante="tonal">{l.tipo === "entrada" ? t.recebido : t.pago}</BotaoEnviar></form>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {porEvento.length > 0 && (
        <Section title={t.porEvento} count={porEvento.length}>
          <div><Botao href="/financas/simulador" icone="gerar-outra" variante="fantasma" tamanho="M">{t.simularPreco}</Botao></div>
          <Tabela rotulo={t.porEvento} colunas={[
            { id: "ev", rotulo: t.eventoFin }, { id: "e", rotulo: t.entradas, numero: true }, { id: "d", rotulo: t.despesas, numero: true },
            { id: "r", rotulo: t.resultado, numero: true }, { id: "p", rotulo: t.aReceber, numero: true },
          ]} linhas={porEvento.map((x) => ({ id: x.evento, celulas: {
            ev: <Link href={`/financas/simulador?base=${encodeURIComponent(x.evento)}`} className="anel-foco rounded-interno hover:underline" title={t.simularPreco}>{x.evento}</Link>, e: <span className="text-ok">{brl0(x.entradas)}</span>, d: <span className="text-err">{brl0(x.despesas)}</span>,
            r: <span className={x.resultado < 0 ? "text-err" : "text-t1"}>{brl0(x.resultado)}</span>, p: x.aReceber ? <span className="text-warn">{brl0(x.aReceber)}</span> : "—",
          } }))} />
        </Section>
      )}

      {porCategoria.length > 0 && (
        <Section title={t.porCategoria}>
          <div className="grid gap-2">{porCategoria.map(([c, v]) => <Bar key={c} label={c} value={v} max={porCategoria[0][1]} cls="bg-err" />)}</div>
        </Section>
      )}

      {porProjeto.length > 0 && (
        <Section title={t.porProjeto}>
          <Tabela rotulo={t.porProjeto} ordemInicial={{ id: "d", desc: true }} colunas={[
            { id: "nome", rotulo: t.projeto, ordenavel: true }, { id: "e", rotulo: t.entradas, numero: true, ordenavel: true }, { id: "d", rotulo: t.despesas, numero: true, ordenavel: true },
          ]} linhas={porProjeto.map((p) => ({ id: p.nome, valores: { nome: p.nome, e: p.e, d: p.d },
            celulas: { nome: p.nome, e: <span className="text-ok">+{brl(p.e)}</span>, d: <span className="text-err">−{brl(p.d)}</span> } }))} />
        </Section>
      )}

      <Section title={t.ultimosMeses}>
        <div className="grid grid-cols-6 gap-2 items-end h-32">
          {meses.map((x) => (
            <Link key={x.m} href={`/financas?m=${x.m}`} className="flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-0.5 h-full">
                <div className="w-3 rounded-t-[4px] bg-ok" style={{ height: `${(x.e / maxMes) * 100}%` }} title={brl(x.e)} />
                <div className="w-3 rounded-t-[4px] bg-err" style={{ height: `${(x.d / maxMes) * 100}%` }} title={brl(x.d)} />
              </div>
              <span className={`meta ${x.m === mes ? "font-bold text-t1" : "text-t2"}`}>{fmtDate(x.m, lang).slice(0, 3)}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t.lancamentos} count={lista.length}>
        <Tabela rotulo={t.lancamentos} vazio={<EstadoVazio compacto titulo={<>{t.semLancamentos}</>} />} ordemInicial={{ id: "data", desc: true }} colunas={[
          { id: "desc", rotulo: t.descricao, ordenavel: true }, { id: "data", rotulo: t.data, ordenavel: true }, { id: "cat", rotulo: t.categoria, ordenavel: true },
          { id: "ev", rotulo: t.eventoFin, soComputador: true }, { id: "conta", rotulo: t.contaLbl, soComputador: true }, { id: "proj", rotulo: t.projeto, soComputador: true }, { id: "por", rotulo: t.registradoPorLbl, soComputador: true }, { id: "valor", rotulo: t.valor, numero: true, ordenavel: true },
        ]} linhas={lista.map((l) => ({
          id: l.id, apagada: l.anulado,
          valores: { desc: l.descricao || l.categoria, data: l.data, cat: l.categoria, valor: l.tipo === "entrada" ? l.valor : -l.valor },
          celulas: {
            desc: <span className="inline-flex flex-wrap items-center gap-2"><Link href={`/financas/${encodeURIComponent(l.id)}`} className={`anel-foco rounded-interno hover:underline ${l.anulado ? "line-through" : ""}`}>{l.descricao || l.categoria}{l.anulado ? ` · ${t.anulado}` : ""}</Link>{l.comprovante && <span className="text-t3" role="img" aria-label={t.temComprovante} title={t.temComprovante}><Icone nome="imagem" tamanho={16} /></span>}{l.participante && <span className="meta text-t3">{l.participante}</span>}{l.pendente && !l.anulado && <BadgeEstado estado="pendente">{rotPend(l.tipo)}</BadgeEstado>}{l.fixo && <BadgeEstado estado="interna">{t.fixoLbl}</BadgeEstado>}</span>,
            ev: l.evento, conta: nomeConta(l.conta),
            data: fmtDate(l.data, lang), cat: l.categoria, proj: l.projeto ? projetos.find((p) => p.id === l.projeto)?.nome ?? l.projeto : "", por: nome(l.registradoPor),
            valor: <span className={`font-semibold ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>,
          },
          acoes: !l.anulado && (
            <form key={l.id} action={anularLancamentoAction}><input type="hidden" name="id" value={l.id} /><BotaoIcone type="submit" icone="fechar" aria-label={`${t.anular}: ${l.descricao || l.categoria}`} tamanho={40} variante="fantasma" /></form>
          ),
        }))} />
      </Section>
    </>
  );
}
