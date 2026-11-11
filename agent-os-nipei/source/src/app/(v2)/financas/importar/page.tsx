import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo, { CAMPO_COMPACTO } from "@/components/ds/Campo";
import Botao from "@/components/ds/Botao";
import { BadgeEstado } from "@/components/ds/Chip";
import Tabela from "@/components/ds/padroes/Tabela";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Upload from "@/components/v2/Upload";
import { CATEGORIAS, currentUser, getLancamentos, getProjetos } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { getPrevia, importaveis } from "@/lib/v2/importarFinancas";
import { cancelarImportacaoAction, importarPlanilhaAction, lerPlanilhaAction } from "../../actions";

// Finanças → Importar planilha (DS 10.25, gestão): step 1 upload a CSV; step 2 preview what the server read
// (nothing is written until "Importar"). The preview is per person, in .jobs/importacoes/.
export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ImportarFinancas() {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const { t, lang } = await getT();
  const p = getPrevia(me.pessoa?.id ?? me.username);
  const cab = <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={t.importarPlanilha}
    acoes={<Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>} />;

  if (!p) return (
    <>
      {cab}
      <Cartao>
        <p className="titulo-cartao">{t.importarPasso1}</p>
        <p className="corpo mt-1 text-t2">{t.importarExplica}</p>
        <p className="meta mt-3 text-t3">{t.importarColunas}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Upload id="financas" action={lerPlanilhaAction} accept=".csv,.tsv,.txt,text/csv" soArquivo
            labels={{ arquivo: t.escolherPlanilha, foto: "", enviando: t.lendoPlanilha, maximo: "Máximo 2 MB" }} />
          <Botao href="/financas/importar/modelo" download icone="baixar" variante="fantasma" tamanho="M">{t.baixarModelo}</Botao>
        </div>
      </Cartao>
    </>
  );

  const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const ok = importaveis(p), avisos = ok.filter((l) => l.avisos.length).length;
  const ignoradas = p.linhas.length - ok.length;
  // the import repeats only when the same entry is already there (data + tipo + valor + descrição)
  const projetos = getProjetos(), eventos = [...new Set(getLancamentos().filter((l) => l.evento && !l.anulado).map((l) => l.evento))];
  return (
    <>
      {cab}
      <Cartao>
        <p className="titulo-cartao">{t.importarPasso2}: {p.arquivo}</p>
        <p className="meta mt-1 text-t2">
          {pl(p.linhas.length, t.linhaMin, t.linhas)} · {ok.length} {t.prontas}{avisos ? ` · ${avisos} ${t.comAviso}` : ""}{ignoradas ? ` · ${ignoradas} ${t.ignoradas}` : ""}
        </p>
        <form id="importar-planilha" action={importarPlanilhaAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue="santuario">
            <option value="">{t.geral}</option>{projetos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Campo>
          <Campo name="evento" rotulo={t.eventoLinhasSem} list="eventos-imp" maxLength={80} placeholder={t.eventoFinEx} />
          <datalist id="eventos-imp">{eventos.map((e) => <option key={e} value={e} />)}</datalist>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {ok.length > 0 && <BotaoEnviar enviando={t.importando} icone="confirmar" variante="primario">{`${t.importarN} ${pl(ok.length, t.lancamentoMin, t.lancamentosMin)}`}</BotaoEnviar>}
          </div>
        </form>
        <form action={cancelarImportacaoAction} className="mt-2"><BotaoEnviar enviando="…" icone="fechar" variante="fantasma">{t.cancelar}</BotaoEnviar></form>
      </Cartao>

      <div className="mt-6">
        <Tabela rotulo={t.importarPasso2} colunas={[
          { id: "data", rotulo: t.data }, { id: "desc", rotulo: t.descricao }, { id: "cat", rotulo: t.categoria },
          { id: "ev", rotulo: t.eventoFin, soComputador: true }, { id: "valor", rotulo: t.valor, numero: true },
        ]} linhas={p.linhas.map((l) => ({
          id: String(l.linha), apagada: !!l.erro || l.repetido,
          celulas: {
            data: l.data ? fmtDate(l.data, lang) : `${t.linha} ${l.linha}`,
            desc: (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>{l.descricao || l.categoria}</span>
                {l.participante && <span className="meta text-t3">{l.participante}</span>}
                {l.erro && <BadgeEstado estado="atrasada">{`${t.erroLbl}: ${l.erro}`}</BadgeEstado>}
                {l.repetido && <BadgeEstado estado="interna">{t.repetido}</BadgeEstado>}
                {l.pendente && <BadgeEstado estado="pendente">{l.tipo === "entrada" ? t.aReceber : t.aPagar}</BadgeEstado>}
                {l.avisos.map((a) => <BadgeEstado key={a} estado="aviso">{a}</BadgeEstado>)}
              </span>
            ),
            // editable for rows that will be imported (bank statements have no category); the field sits outside the form → `form=`
            cat: l.erro || l.repetido ? l.categoria : (
              <select form="importar-planilha" name={`cat:${l.linha}`} defaultValue={l.categoria} aria-label={`${t.categoria}: ${l.descricao || l.linha}`} className={`${CAMPO_COMPACTO} w-full min-w-0 md:min-w-44`}>
                {CATEGORIAS[l.tipo].map((c) => <option key={c}>{c}</option>)}
              </select>
            ),
            ev: l.evento,
            valor: <span className={`font-semibold ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>,
          },
        }))} />
      </div>
    </>
  );
}
