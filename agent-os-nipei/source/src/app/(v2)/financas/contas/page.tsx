import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Icone from "@/components/ds/Icone";
import { BadgeEstado } from "@/components/ds/Chip";
import { ToastAoAbrir } from "@/components/ds/Toast";
import Tabela from "@/components/ds/padroes/Tabela";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser, getContas, getLancamentos, today } from "@/lib/v2/data";
import { TIPOS_CONTA, resumoContas } from "@/lib/v2/contas";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { contaAtivaAction, salvarContaAction } from "../../actions";
import { podeFinancas } from "@/lib/v2/funcoes";

// Contas (DS 10.25, gestão): bank, cash, Pix — balance of each and the way into the reconciliation.
export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const valorBR = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Contas({ searchParams }: { searchParams: Promise<{ editar?: string; ok?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const r = resumoContas(getContas(), getLancamentos(), hoje);
  const ed = r.contas.find((c) => c.id === q.editar);
  const total = r.contas.filter((c) => c.ativa).reduce((a, c) => a + c.saldo, 0);

  return (
    <>
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={t.contas}
        subtitulo={r.contas.length ? <>{t.saldoNasContas}: <span className={total < 0 ? "text-err" : ""}>{brl(total)}</span></> : undefined}
        acoes={<Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />
      <ToastAoAbrir texto={q.ok} />
      <p className="corpo mb-4 max-w-2xl text-t2">{t.contasExplica}</p>

      <Tabela rotulo={t.contas} vazio={<p className="meta text-t3">{t.semContas}</p>} colunas={[
        { id: "nome", rotulo: t.contaLbl }, { id: "tipo", rotulo: t.tipoConta, soComputador: true }, { id: "saldo", rotulo: t.saldoHoje, numero: true }, { id: "conc", rotulo: t.conciliadoAte, soComputador: true },
      ]} linhas={r.contas.map((c) => ({
        id: c.id, apagada: !c.ativa,
        celulas: {
          nome: <span className="inline-flex flex-wrap items-center gap-2">{c.nome}{!c.ativa && <BadgeEstado estado="interna">{t.contaArquivada}</BadgeEstado>}</span>,
          tipo: t.tiposConta[c.tipo], saldo: <span className={`font-semibold tabular-nums ${c.saldo < 0 ? "text-err" : "text-t1"}`}>{brl(c.saldo)}</span>,
          conc: c.conciliadoAte ? fmtDate(c.conciliadoAte, lang) : "—",
        },
        acoes: (
          <span key={c.id} className="inline-flex flex-wrap items-center gap-1">
            <BotaoIcone icone="editar" aria-label={`${t.editar}: ${c.nome}`} tamanho={40} variante="fantasma" href={`/financas/contas?editar=${c.id}#form-conta`} />
            {c.ativa && <Botao href={`/financas/importar?conta=${c.id}`} icone="confirmar" variante="fantasma" tamanho="M">{t.conciliar}</Botao>}
            <form action={contaAtivaAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="ativa" value={c.ativa ? "0" : "1"} />
              <BotaoEnviar enviando="…" icone={c.ativa ? "fechar" : "gerar-outra"} variante="fantasma">{c.ativa ? t.arquivarConta : t.reativar}</BotaoEnviar></form>
          </span>
        ),
      }))} />
      {r.semConta > 0 && <p className="meta mt-2 text-t3">{r.semConta} {t.semContaN}</p>}

      <Cartao className="mt-6 max-w-2xl">
        <form id="form-conta" action={salvarContaAction} className="grid gap-3" key={ed?.id ?? "nova"}>
          <p className="titulo-cartao inline-flex items-center gap-2"><Icone nome={ed ? "editar" : "mais"} tamanho={18} />{ed ? t.editarConta : t.novaConta}</p>
          {ed && <input type="hidden" name="id" value={ed.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Campo name="nome" rotulo={t.nomeConta} maxLength={60} defaultValue={ed?.nome} placeholder={t.nomeContaEx} required />
            <Campo tipo="selecao" name="tipo" rotulo={t.tipoConta} defaultValue={ed?.tipo ?? "banco"}>
              {TIPOS_CONTA.map((x) => <option key={x} value={x}>{t.tiposConta[x]}</option>)}
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo name="saldo" rotulo={t.saldoInicial} inputMode="decimal" placeholder="0,00" defaultValue={ed ? valorBR(ed.saldoInicial) : undefined} />
            <Campo tipo="data" name="desde" rotulo={t.saldoEm} defaultValue={ed?.desde ?? hoje} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.salvar}</BotaoEnviar>
            {ed && <Botao href="/financas/contas" variante="fantasma" tamanho="M" icone="fechar">{t.cancelar}</Botao>}
          </div>
        </form>
      </Cartao>
    </>
  );
}
