import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/v2/ui";
import AutoRefresh from "@/components/v2/AutoRefresh";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Aviso from "@/components/ds/Aviso";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { EstadoVazio } from "@/components/ds/Estados";
import { currentUser, getEquipes, getObjetivos, getPessoas, getProjetos } from "@/lib/v2/data";
import { diaLocal, getFatos, getFontes, podeRevisar, type StatusFato } from "@/lib/v2/conhecimento";
import { getAlertas } from "@/lib/v2/auditor";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { reprocessarFonteAction, revisarFatoAction } from "../../actions";

// estado do fato = ícone + texto (regra 10); proposto = hachurado (regra 6)
const ESTADO: Record<StatusFato, string> = {
  proposto: "hachurado text-t1 shadow-[inset_0_0_0_1px_var(--s3)]", confirmado: "bg-ok-bg text-ok", substituido: "bg-s3 text-t2", descartado: "bg-s3 text-t3",
};
const ICONE_ESTADO = { proposto: "prazo", confirmado: "sucesso", substituido: "gerar-outra", descartado: "fechar" } as const;

export default async function FonteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const f = getFontes().find((x) => x.id === id);
  if (!f) notFound();
  const fatos = getFatos().filter((x) => x.fonte === id).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const comAlerta = new Map(getAlertas().filter((a) => a.status === "aberta").map((a) => [a.fato, a]));
  const meus = fatos.filter((x) => x.status === "proposto" && podeRevisar(me, x));
  const semAlerta = meus.filter((x) => !comAlerta.has(x.id));
  const equipes = getEquipes(), projetos = getProjetos(), objetivos = getObjetivos(), pessoas = getPessoas();
  const nome = (pid: string) => pessoas.find((p) => p.id === pid)?.name.split(" (")[0] ?? pid;
  const podeReprocessar = f.status !== "processando" && (me.gestao || f.enviadoPor === (me.pessoa?.id ?? me.username));
  const statusTxt: Record<StatusFato, string> = { proposto: t.status_proposto, confirmado: t.status_confirmado, substituido: t.status_substituido, descartado: t.status_descartado };
  const ligados = (x: (typeof fatos)[number]) => [
    equipes.find((e) => e.id === x.equipe)?.nome, ...x.projetos.map((p) => projetos.find((y) => y.id === p)?.nome),
    ...x.objetivos.map((o) => objetivos.find((y) => y.id === o)?.titulo), ...x.pessoas.map(nome), x.dataReferencia && fmtDate(x.dataReferencia, lang),
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-4xl">
      <AutoRefresh ativo={f.status === "processando"} />
      <div className="-ml-3 mb-2"><Botao href="/conhecimento" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" rotulo={`${t.enviadoPor} ${nome(f.enviadoPor)} · ${fmtDate(diaLocal(f.enviadoEm), lang)}`} titulo={<span className="break-words">{f.titulo || f.url}</span>}
        filtros={<>
          {f.arquivo && <Chip href={`/conhecimento/${f.id}/arquivo`} icone="abrir-fora">{t.verOriginal}</Chip>}
          {f.url && <Chip href={f.url} icone="abrir-fora">{t.verOriginal}</Chip>}
          {f.acervo && <Chip href={`/acervo#${f.acervo}`} icone="abrir-fora">{t.noAcervo}</Chip>}
          {f.tarefa && <Chip href={`/tarefas/${f.tarefa}`} icone="tarefa">{t.daTarefa}</Chip>}
        </>} />

      {f.status === "processando" && <p role="status" className="meta mb-6 flex items-center gap-2 text-t2"><span aria-hidden="true" className="arco-girando size-4 motion-reduce:hidden" />{t.processando}</p>}
      {f.status === "erro" && <Aviso estado="erro" className="mb-4" titulo={t.erroFonte} mensagem={f.erro} />}
      {podeReprocessar && (f.status === "erro" || meus.length > 0 || fatos.length === 0) && (
        <form action={reprocessarFonteAction} className="mb-6"><input type="hidden" name="id" value={f.id} /><BotaoEnviar enviando="…" icone="gerar-outra">{t.reprocessar}</BotaoEnviar></form>
      )}

      {f.resumo && f.status === "pronta" && (
        <Section title={t.resumoFonte}><div className="corpo whitespace-pre-wrap rounded-cartao bg-s1 p-4 text-t1">{f.resumo}</div></Section>
      )}

      {f.status === "pronta" && (
        <Section title={t.fatos} count={fatos.length}>
          {semAlerta.length > 1 && (
            <form action={revisarFatoAction}>
              {semAlerta.map((x) => <input key={x.id} type="hidden" name="id" value={x.id} />)}
              <BotaoEnviar name="acao" value="confirmar" enviando="…" icone="confirmar" variante="primario">{`${t.confirmarTodos} (${semAlerta.length})`}</BotaoEnviar>
            </form>
          )}
          {fatos.length === 0 && <EstadoVazio compacto selo="espiral" titulo={t.semFatos} />}
          <ul className="grid gap-3">
            {fatos.map((x) => (
              <li key={x.id} className="grid gap-2 rounded-cartao bg-s1 p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rotulo-maiusculo text-t3">{t.tiposFato[x.tipo as keyof typeof t.tiposFato] ?? x.tipo}</span>
                  <span className={`inline-flex h-7 items-center gap-1.5 rounded-pilula px-2.5 font-texto text-[13px] font-medium ${ESTADO[x.status]}`}><Icone nome={ICONE_ESTADO[x.status]} tamanho={14} />{statusTxt[x.status]}</span>
                  {x.revisadoPor && <span className="meta text-t3">{x.revisadoPor}</span>}
                  {x.status !== "proposto" && <Link href={`/conhecimento/fato/${x.id}`} className="anel-foco alvo-toque meta ml-auto inline-flex items-center gap-1 rounded-interno text-t2 hover:text-t1 hover:underline">{t.verFato}<Icone nome="avancar" tamanho={14} /></Link>}
                </p>
                {comAlerta.has(x.id) && (
                  <Link href="/conhecimento/alertas" className="anel-foco meta inline-flex items-start gap-1.5 rounded-interno text-err hover:underline">
                    <Icone nome="atencao" tamanho={16} className="mt-px shrink-0" />{t.tiposAlerta[comAlerta.get(x.id)!.tipo]}: {comAlerta.get(x.id)!.explicacao} — {t.alertaAberto}
                  </Link>
                )}
                {x.status === "proposto" && podeRevisar(me, x) ? (
                  <form action={revisarFatoAction} className="grid gap-2">
                    <input type="hidden" name="id" value={x.id} />
                    <Campo tipo="area" name="texto" rotulo={t.fatos} defaultValue={x.texto} rows={2} maxLength={600} />
                    <div className="flex flex-wrap gap-2">
                      <BotaoEnviar name="acao" value="confirmar" enviando="…" icone="confirmar" variante="primario">{t.confirmar}</BotaoEnviar>
                      <BotaoEnviar name="acao" value="descartar" enviando="…" icone="fechar" variante="fantasma">{t.descartar}</BotaoEnviar>
                    </div>
                  </form>
                ) : (
                  <p className={`corpo ${x.status === "descartado" ? "text-t3 line-through" : "text-t1"}`}>{x.texto}</p>
                )}
                {ligados(x) && <p className="meta text-t2">{ligados(x)}</p>}
                {x.status === "proposto" && !podeRevisar(me, x) && <p className="meta text-t3">{t.aguardandoRevisao}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {f.texto && f.status === "pronta" && (
        <details className="group mb-8 rounded-cartao bg-s1 p-4">
          <summary className="anel-foco flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-interno"><span className="titulo-cartao">{t.textoFonte}</span><Icone nome="abrir" tamanho={18} className="ml-auto text-t3 transition-transform group-open:rotate-180" /></summary>
          <div className="meta mt-3 whitespace-pre-wrap text-t2">{f.texto}</div>
        </details>
      )}
    </div>
  );
}
