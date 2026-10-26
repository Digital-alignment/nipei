import Link from "next/link";
import { EstadoVazio } from "@/components/ds/Estados";
import { Section } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { MiniAnelPinu } from "@/components/ds/Pinu";
import { currentUser } from "@/lib/v2/data";
import { diaLocal, getFatos, podeRevisar, type StatusFato } from "@/lib/v2/conhecimento";
import { getAlertas, type Alerta } from "@/lib/v2/auditor";
import { getPropostas, podeDecidir } from "@/lib/v2/propostas";
import { getEquipes, getProjetos, getTarefas } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { auditarAgoraAction, decidirPropostaAction, resolverAlertaAction } from "../../actions";

// tipo de alerta = ícone + texto + cor de estado
const TIPO: Record<Alerta["tipo"], { cor: string; icone: "erro" | "atencao" | "informacao" }> = {
  contradicao: { cor: "bg-err-bg text-err", icone: "erro" }, ja_corrigido: { cor: "bg-warn-bg text-warn", icone: "atencao" },
  duplicado: { cor: "bg-s3 text-t2", icone: "informacao" }, desatualizado: { cor: "bg-warn-bg text-warn", icone: "atencao" },
};

export default async function Alertas() {
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const fatos = getFatos();
  const fato = (id: string) => fatos.find((f) => f.id === id);
  const todas = getAlertas();
  const pode = (a: Alerta) => { const f = fato(a.fato); return f ? podeRevisar(me, f) : me.gestao; };
  const abertas = todas.filter((a) => a.status === "aberta" && pode(a));
  const resolvidas = todas.filter((a) => a.status === "resolvida" && pode(a)).sort((a, b) => b.resolvidoEm.localeCompare(a.resolvidoEm)).slice(0, 10);
  const statusTxt: Record<StatusFato, string> = { proposto: t.status_proposto, confirmado: t.status_confirmado, substituido: t.status_substituido, descartado: t.status_descartado };
  const tarefas = getTarefas(), projetos = getProjetos(), equipes = getEquipes();
  const propostas = getPropostas().filter((p) => p.status === "aberta" && podeDecidir(me, p, tarefas));
  const acaoTxt: Record<string, string> = { substituir: t.acaoSubstituir, eliminar: t.acaoEliminar, editar: t.acaoEditar, manter: t.acaoManter };
  const Selo = ({ tipo }: { tipo: Alerta["tipo"] }) => (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-pilula px-2.5 font-texto text-[13px] font-semibold ${TIPO[tipo].cor}`}><Icone nome={TIPO[tipo].icone} tamanho={14} />{t.tiposAlerta[tipo]}</span>
  );

  // which buttons each kind of alert offers (labels follow what the decision means for that kind)
  const botoes = (a: Alerta): [string, string][] =>
    a.tipo === "desatualizado" ? [["manter", t.acaoAindaVale], ["eliminar", t.acaoEliminarFato]]
      : a.tipo === "contradicao" ? [["substituir", t.acaoSubstituir], ["eliminar", t.acaoEliminar], ["manter", t.acaoManter]]
        : [["eliminar", t.acaoEliminar], ["substituir", t.acaoConfirmarMesmo]];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="-ml-3 mb-2"><Botao href="/conhecimento" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" rotulo={t.conhecimento} titulo={t.alertasEPropostas} subtitulo={t.alertasIntro}
        acoes={me.gestao && <form action={auditarAgoraAction}><BotaoEnviar enviando="…" icone="gerar-outra">{t.auditarAgora}</BotaoEnviar></form>} />

      <Section title={t.propostas} count={propostas.length}>
        <p className="meta text-t2">{t.propostasIntro}</p>
        {propostas.length === 0 ? <EstadoVazio compacto titulo={<>{t.semPropostas}</>} /> : (
          <ul className="grid gap-3">
            {propostas.map((p) => {
              const tarefa = tarefas.find((x) => x.id === p.tarefa);
              const projeto = projetos.find((x) => x.id === p.projeto);
              return (
                // proposta da IA: cartão do Pinu
                <li key={p.id} className="grid gap-2.5 rounded-cartao p-4 shadow-brilho-ia" style={{ background: "linear-gradient(160deg, var(--ac-soft), var(--s1) 70%)" }}>
                  <p className="flex items-center gap-2"><MiniAnelPinu tamanho={18} /><span className="rotulo-maiusculo text-ac-text">{t.tiposProposta[p.tipo]}</span></p>
                  {tarefa && <Link href={`/tarefas/${tarefa.id}`} className="anel-foco titulo-cartao rounded-interno hover:underline">{tarefa.title}{tarefa.prazo && ` · ${fmtDate(tarefa.prazo, lang)}`}</Link>}
                  {projeto && <Link href={`/projetos/${projeto.id}`} className="anel-foco titulo-cartao rounded-interno hover:underline">{projeto.nome}</Link>}
                  {p.tipo === "nova_tarefa" && <p className="meta text-t2">{[equipes.find((e) => e.id === p.equipe)?.nome, projetos.find((x) => x.id === p.projeto)?.nome].filter(Boolean).join(" · ")}</p>}
                  <p className="corpo text-t2">{t.porque}: {p.motivo}</p>
                  {p.fatos.map((id) => fato(id)).filter(Boolean).map((f) => (
                    <p key={f!.id} className="meta border-l-2 border-s3 pl-3 text-t2">{f!.texto}</p>
                  ))}
                  <form action={decidirPropostaAction} className="grid gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    {p.tipo === "nova_tarefa" && <Campo name="titulo" rotulo={t.titulo} defaultValue={p.titulo} maxLength={200} className="bg-s1!" />}
                    {(p.tipo === "mudar_prazo" || p.tipo === "nova_tarefa") && <div className="max-w-56"><Campo tipo="data" name="prazo" rotulo={t.prazo} defaultValue={p.prazo} className="bg-s1!" /></div>}
                    {(p.tipo === "comentar_tarefa" || p.tipo === "nota_projeto") && <Campo tipo="area" name="texto" rotulo={t.descricao} defaultValue={p.texto} rows={2} maxLength={600} className="bg-s1!" />}
                    <div className="flex flex-wrap gap-2">
                      <BotaoEnviar name="acao" value="aplicar" enviando="…" icone="confirmar" variante="primario">{t.aplicar}</BotaoEnviar>
                      <BotaoEnviar name="acao" value="recusar" enviando="…" icone="fechar" variante="fantasma">{t.recusar}</BotaoEnviar>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t.alertas} count={abertas.length}>
        {abertas.length === 0 ? <EstadoVazio compacto titulo={<>{t.semAlertas}</>} /> : (
          <ul className="grid gap-3">
            {abertas.map((a) => {
              const f = fato(a.fato);
              return (
                <li key={a.id} className="grid gap-3 rounded-cartao bg-s1 p-4">
                  <div className="grid gap-1.5"><Selo tipo={a.tipo} /><p className="corpo text-t1">{a.explicacao}</p></div>
                  {f && (
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="rotulo-maiusculo text-t3">{t.fatoNovo} · {statusTxt[f.status]}</p>
                        <p className="corpo text-t1">{f.texto}</p>
                      </div>
                      <BotaoIcone icone="avancar" aria-label={t.verOriginal} tamanho={40} variante="fantasma" href={`/conhecimento/${f.fonte}`} />
                    </div>
                  )}
                  {a.outros.map((id) => fato(id)).filter(Boolean).map((o) => (
                    <div key={o!.id} className="flex items-start gap-1 border-l-2 border-s3 pl-3">
                      <div className="min-w-0 flex-1">
                        <p className="rotulo-maiusculo text-t3">{t.comparadoCom} · {statusTxt[o!.status]}{o!.revisadoPor && ` · ${o!.revisadoPor}`}</p>
                        <p className="corpo text-t1">{o!.texto}</p>
                      </div>
                      <BotaoIcone icone="avancar" aria-label={t.verOriginal} tamanho={40} variante="fantasma" href={`/conhecimento/${o!.fonte}`} />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    {botoes(a).map(([acao, label], i) => (
                      <form key={acao} action={resolverAlertaAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <BotaoEnviar name="acao" value={acao} enviando="…" icone={acao === "eliminar" ? "lixeira" : acao === "manter" ? "confirmar" : "gerar-outra"} variante={i === 0 ? "primario" : "tonal"}>{label}</BotaoEnviar>
                      </form>
                    ))}
                  </div>
                  {f && (
                    <form action={resolverAlertaAction} className="grid gap-2">
                      <input type="hidden" name="id" value={a.id} />
                      <Campo tipo="area" name="texto" rotulo={a.sugestao ? t.sugestaoIA : t.acaoEditar} defaultValue={a.sugestao || f.texto} rows={2} maxLength={600} />
                      <div><BotaoEnviar name="acao" value="editar" enviando="…" icone="editar">{t.acaoEditar}</BotaoEnviar></div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {resolvidas.length > 0 && (
        <Section title={t.resolvidas} count={resolvidas.length}>
          <ul className="overflow-hidden rounded-cartao bg-s1">
            {resolvidas.map((a) => (
              <li key={a.id} className="grid gap-1.5 border-t border-s2 px-4 py-3 first:border-t-0">
                <span className="flex flex-wrap items-center gap-2"><Selo tipo={a.tipo} /><span className="meta text-t3">{a.resolvidoPor} · {fmtDate(diaLocal(a.resolvidoEm), lang)}</span></span>
                <span className="corpo text-t2">{fato(a.fato)?.texto.slice(0, 90)} → {acaoTxt[a.resolucao] ?? a.resolucao}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
