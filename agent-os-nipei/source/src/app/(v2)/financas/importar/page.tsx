import Link from "next/link";
import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo, { CAMPO_COMPACTO } from "@/components/ds/Campo";
import Botao from "@/components/ds/Botao";
import { BadgeEstado } from "@/components/ds/Chip";
import Tabela from "@/components/ds/padroes/Tabela";
import { Section } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Upload from "@/components/v2/Upload";
import { FiltroAuto } from "@/components/v2/AcervoForm";
import { CATEGORIAS, currentUser, getContas, getLancamentos, getProjetos } from "@/lib/v2/data";
import { saldoConta } from "@/lib/v2/contas";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { conciliar, getPrevia, importaveis } from "@/lib/v2/importarFinancas";
import { cancelarImportacaoAction, importarPlanilhaAction, lerPlanilhaAction } from "../../actions";
import { podeFinancas } from "@/lib/v2/funcoes";

// Finanças → Importar planilha / extrato (DS 10.25, gestão): step 1 upload a CSV; step 2 preview what the server read
// (nothing is written until "Importar"). With an account (?conta=), the preview reconciles the statement with the
// entries already recorded. The preview is per person, in .jobs/importacoes/.
export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ImportarFinancas({ searchParams }: { searchParams: Promise<{ conta?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const { t, lang } = await getT();
  const q = await searchParams;
  const contasAtivas = getContas().filter((c) => c.ativa);
  const conta = contasAtivas.find((c) => c.id === q.conta);
  const p = getPrevia(me.pessoa?.id ?? me.username);
  const cab = <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={conta ? `${t.conciliar}: ${conta.nome}` : t.importarPlanilha}
    acoes={<Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />;

  if (!p) return (
    <>
      {cab}
      <Cartao>
        <p className="titulo-cartao">{t.importarPasso1}</p>
        <p className="corpo mt-1 text-t2">{t.importarExplica}</p>
        <p className="meta mt-3 text-t3">{t.importarColunas}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Upload id="financas" action={lerPlanilhaAction} accept=".csv,.tsv,.txt,text/csv" soArquivo extra={conta ? { conta: conta.id } : {}}
            labels={{ arquivo: t.escolherPlanilha, foto: "", enviando: t.lendoPlanilha, maximo: "Máximo 2 MB" }} />
          <Botao href="/financas/importar/modelo" download icone="baixar" variante="fantasma" tamanho="M">{t.baixarModelo}</Botao>
        </div>
      </Cartao>
    </>
  );

  const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const todos = getLancamentos();
  const conc = conta ? conciliar(p.linhas, todos, conta.id) : null;
  const par = conc?.par ?? new Map<number, string>();
  const ok = importaveis(p).filter((l) => !par.has(l.linha)), avisos = ok.filter((l) => l.avisos.length).length;
  const ignoradas = p.linhas.length - ok.length - par.size;
  const porId = new Map(todos.map((l) => [l.id, l]));
  const fora = (conc?.fora ?? []).map((id) => porId.get(id)!).filter(Boolean);
  const saldoAntes = conta && conc?.ate ? saldoConta(conta, todos, conc.ate) : 0;
  const saldoDepois = saldoAntes + ok.filter((l) => !conc || l.data <= conc.ate).reduce((a, l) => a + (l.tipo === "entrada" ? l.valor : -l.valor), 0)
    // reconciled entries move into this account (and pending ones become paid): those not counted in it yet enter the balance
    + [...par.values()].map((id) => porId.get(id)).filter((e) => e && conta && (e.conta !== conta.id || e.pendente) && e.data >= conta.desde).reduce((a, e) => a + (e!.tipo === "entrada" ? e!.valor : -e!.valor), 0);
  const projetos = getProjetos(), eventos = [...new Set(todos.filter((l) => l.evento && !l.anulado).map((l) => l.evento))];
  return (
    <>
      {cab}
      <Cartao>
        <p className="titulo-cartao">{t.importarPasso2}: {p.arquivo}</p>
        <p className="meta mt-1 text-t2">
          {pl(p.linhas.length, t.linhaMin, t.linhas)} · {ok.length} {conta ? t.novas : t.prontas}{par.size ? ` · ${par.size} ${t.jaRegistradas}` : ""}{avisos ? ` · ${avisos} ${t.comAviso}` : ""}{ignoradas ? ` · ${ignoradas} ${t.ignoradas}` : ""}
        </p>
        {contasAtivas.length > 0 && (
          <FiltroAuto className="mt-4 max-w-sm">
            <Campo tipo="selecao" name="conta" rotulo={t.contaExtrato} defaultValue={conta?.id ?? ""} ajuda={t.contaExtratoAjuda}>
              <option value="">—</option>{contasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Campo>
          </FiltroAuto>
        )}
        <form id="importar-planilha" action={importarPlanilhaAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          {conta && <input type="hidden" name="conta" value={conta.id} />}
          <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue="santuario">
            <option value="">{t.geral}</option>{projetos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Campo>
          <Campo name="evento" rotulo={t.eventoLinhasSem} list="eventos-imp" maxLength={80} placeholder={t.eventoFinEx} />
          <datalist id="eventos-imp">{eventos.map((e) => <option key={e} value={e} />)}</datalist>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {(ok.length > 0 || par.size > 0) && <BotaoEnviar enviando={t.importando} icone="confirmar" variante="primario">{`${t.importarN} ${pl(ok.length, t.lancamentoMin, t.lancamentosMin)}${par.size ? ` ${t.importarEConciliar} ${par.size}` : ""}`}</BotaoEnviar>}
          </div>
        </form>
        <form action={cancelarImportacaoAction} className="mt-2"><BotaoEnviar enviando="…" icone="fechar" variante="fantasma">{t.cancelar}</BotaoEnviar></form>
        {conta && conc?.ate && (
          <p className="meta mt-4 text-t2">
            {t.saldoSistemaEm} {fmtDate(conc.ate, lang)}: <span className="font-semibold tabular-nums text-t1">{brl(saldoAntes)}</span>; {t.depoisImportar}: <span className="font-semibold tabular-nums text-t1">{brl(saldoDepois)}</span> — {t.compareBanco}.
          </p>
        )}
      </Cartao>

      <div className="mt-6">
        <Tabela rotulo={t.importarPasso2} colunas={[
          { id: "data", rotulo: t.data }, { id: "desc", rotulo: t.descricao }, { id: "cat", rotulo: t.categoria },
          { id: "ev", rotulo: t.eventoFin, soComputador: true }, { id: "valor", rotulo: t.valor, numero: true },
        ]} linhas={p.linhas.map((l) => {
          const ja = par.get(l.linha), e = ja ? porId.get(ja) : undefined;
          const entra = !l.erro && !l.repetido && !ja;
          return {
            id: String(l.linha), apagada: !!l.erro || (l.repetido && !ja),
            celulas: {
              data: l.data ? fmtDate(l.data, lang) : `${t.linha} ${l.linha}`,
              desc: (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{l.descricao || l.categoria}</span>
                  {l.participante && <span className="meta text-t3">{l.participante}</span>}
                  {l.erro && <BadgeEstado estado="atrasada">{`${t.erroLbl}: ${l.erro}`}</BadgeEstado>}
                  {e && <Link href={`/financas/${e.id}`} className="anel-foco rounded-pilula"><BadgeEstado estado="feita">{`${t.jaRegistrado}: ${e.descricao || e.categoria}`}</BadgeEstado></Link>}
                  {e?.pendente && <BadgeEstado estado="pendente">{t.pendentePago}</BadgeEstado>}
                  {l.repetido && !ja && <BadgeEstado estado="interna">{t.repetido}</BadgeEstado>}
                  {entra && l.pendente && <BadgeEstado estado="pendente">{l.tipo === "entrada" ? t.aReceber : t.aPagar}</BadgeEstado>}
                  {entra && l.avisos.map((a) => <BadgeEstado key={a} estado="aviso">{a}</BadgeEstado>)}
                </span>
              ),
              // editable for rows that will be imported (bank statements have no category); the field sits outside the form → `form=`
              cat: !entra ? (e?.categoria ?? l.categoria) : (
                <select form="importar-planilha" name={`cat:${l.linha}`} defaultValue={l.categoria} aria-label={`${t.categoria}: ${l.descricao || l.linha}`} className={`${CAMPO_COMPACTO} w-full min-w-0 md:min-w-44`}>
                  {CATEGORIAS[l.tipo].map((c) => <option key={c}>{c}</option>)}
                </select>
              ),
              ev: l.evento,
              valor: <span className={`font-semibold ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>,
            },
          };
        })} />
      </div>

      {fora.length > 0 && (
        <div className="mt-6">
          <Section title={t.foraExtrato} count={fora.length}>
            <p className="meta mb-2 text-t2">{t.foraExplica}</p>
            <ul className="grid gap-1">
              {fora.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-interno bg-s1 px-3 py-2">
                  <span className="meta tabular-nums text-t3">{fmtDate(l.data, lang)}</span>
                  <Link href={`/financas/${l.id}`} className="corpo anel-foco min-w-0 flex-1 rounded-interno text-t1 hover:underline">{l.descricao || l.categoria}</Link>
                  <span className={`font-semibold tabular-nums ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}
