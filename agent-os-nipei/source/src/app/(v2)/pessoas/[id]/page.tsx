import Link from "next/link";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import { AbasComPainel } from "@/components/ds/Abas";
import OQueSabemos from "@/components/v2/OQueSabemos";
import { EstadoVazio } from "@/components/ds/Estados";
import AvatarDS from "@/components/ds/Avatar";
import { chaveEquipe } from "@/components/ds/equipes";
import ChipDS from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import LinhaDoTempo, { deAtividade } from "@/components/ds/padroes/LinhaDoTempo";
import Icone from "@/components/ds/Icone";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TaskRow } from "@/components/v2/ui";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Md from "@/components/v2/Md";
import PrazoRapido from "@/components/v2/PrazoRapido";
import Notificar from "@/components/v2/Notificar";
import { historico } from "@/lib/v2/notificar";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getPessoas, getTarefas, historicoPessoa, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { getColetivo, getDiagnosticos, getRespostas, participa, progresso } from "@/lib/v2/diagnostico";
import { ordenarAgora, type Selo } from "@/lib/v2/ordem";
import { NIVEL_COR } from "@/lib/v2/participacao";
import { getEstudo, resumoPessoas } from "@/lib/v2/pessoasInfo";
import { diaLocal, filtrarConfirmados } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { atribuirAction, coordenacaoAction, enviarLinkAction, estudoAction, externoAction, removerDaEquipeAction, setAvisosPessoaAction, suspensoAction, toggleLangAction } from "../../actions";
import ConfirmarBotao from "@/components/v2/ConfirmarBotao";
import EscolherEquipes from "@/components/v2/EscolherEquipes";
import NotasInternas from "@/components/v2/NotasInternas";
import Conexoes from "@/components/v2/Conexoes";
import Seguranca from "@/components/v2/Seguranca";
import { getNotas } from "@/lib/v2/notasInternas";

const CADASTRO_TTL = 60 * 60 * 24 * 30;
const LOGIN_LINK_TTL = 60 * 60 * 24 * 7;
const digits = (n: string) => n.replace(/\D/g, "");

// A person's profile in tabs: Resumo (numbers, and for gestão Participação + AI study), Tarefas,
// Perfil (details, role from the assessment) and Gestão (links, notices, teams).
export default async function PessoaDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; google?: string; ok?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getPessoas().find((x) => x.id === id);
  if (!p) notFound();
  const sabemos = filtrarConfirmados({ pessoa: p.id });
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas();
  const gerir = can.gerirPessoa(me, p) || (p.equipes.length === 0 && me.gestao);
  const proprio = me.gestao || me.pessoa?.id === p.id; // private fields and "edit" only for the person and gestão
  const temAcesso = p.equipes.some((e) => equipes.find((x) => x.id === e)?.acesso);
  const n = resumoPessoas(me.gestao).get(p.id)!;
  const estudo = me.gestao ? getEstudo(p.id) : null;

  // tasks
  const todas = getTarefas();
  const minhas = todas.filter((x) => x.responsaveis.includes(p.id));
  const abertas = minhas.filter((x) => x.status !== "done");
  const ctx = { hoje, comNovidade: new Set(novidadesPara(me, 3, 50).map((x) => x.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const rowProps = { equipes, pessoas, lang, hoje, me };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.maisSemana, data: new Date(Date.parse(`${hoje}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10) }];
  const lista = (ts: Tarefa[]) => {
    const o = ordenarAgora(ts, ctx);
    return o.tarefas.length ? (
      <ul>{o.tarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])}
        extra={(y) => y.status !== "done" && can.editTarefa(me, y) ? <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} /> : null} />)}</ul>
    ) : <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />;
  };
  const grupos: [string, Tarefa[]][] = [
    [t.agora, abertas.filter((x) => x.prazo && x.prazo <= hoje)],
    [t.proximas, abertas.filter((x) => x.prazo > hoje)],
    [t.semData, abertas.filter((x) => !x.prazo)],
    [t.concluidasRecentes, minhas.filter((x) => x.status === "done").sort((a, b) => (b.concluidoEm || b.atualizadoEm).localeCompare(a.concluidoEm || a.atualizadoEm)).slice(0, 10)],
  ];

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const primeiro = p.name.split(" ")[0];
  const links = gerir ? [
    { tipo: "cadastro", titulo: t.linkCadastro, url: `${origin}/cadastro?token=${signToken("cadastro", p.id, CADASTRO_TTL)}`, msg: t.msgCadastro },
    ...(temAcesso ? [{ tipo: "acesso", titulo: t.linkAcesso, url: `${origin}/entrar?token=${signToken("login-link", p.id, LOGIN_LINK_TTL)}`, msg: t.msgAcesso }] : []),
  ] : [];
  const mudancas = historicoPessoa(p.id);
  const podeAdicionar = equipes.filter((e) => !p.equipes.includes(e.id) && can.gerirEquipe(me, e.id));
  const part = n.participacao;
  const podeNotificar = me.gestao || can.gerirPessoa(me, p);
  const enviados = podeNotificar ? historico(p.id) : [];
  const semDono = todas.filter((x) => x.status !== "done" && !x.responsaveis.length);

  const Num = ({ v, label, alerta }: { v: string | number; label: string; alerta?: boolean }) => (
    <div className="grid gap-0.5 rounded-cartao bg-s1 px-3 py-3">
      <p className={`font-display text-2xl font-light leading-none tabular-nums md:text-3xl ${alerta ? "text-err" : "text-t1"}`}>{v}</p>
      <p className="meta text-t2">{label}</p>
    </div>
  );
  const Campo = ({ k, v }: { k: string; v?: React.ReactNode }) => v ? <div><dt className="rotulo-campo text-t3">{k}</dt><dd className="corpo text-t1">{v}</dd></div> : null;

  // ---------------- tabs
  const resumo = (
    <div className="grid gap-3 pt-3">
      {(p.funcao || p.area || p.disponibilidade) && (
        <Cartao>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Campo k={t.funcaoLbl} v={p.funcao} /><Campo k={t.areaLbl} v={p.area} /><Campo k={t.dispLbl} v={p.disponibilidade} />
          </dl>
        </Cartao>
      )}
      {part && (
        <Cartao>
          <div className="flex items-center justify-between"><p className="rotulo-maiusculo text-t3">{t.participacao}</p><span className="inline-flex items-center gap-1 text-xs text-t3"><Icone nome="cadeado"  tamanho={11} />{t.soGestao}</span></div>
          {part.total == null ? <p className="text-sm text-t2 mt-2">{t.dadosInsuficientes}</p> : (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-semibold tabular-nums ${NIVEL_COR[part.nivel]}`}>{part.total}</span>
                <span className="text-sm text-t2">{part.nivel === "alta" ? t.nivelAlta : part.nivel === "media" ? t.nivelMedia : t.nivelBaixa}</span>
                {part.tendencia != null && part.tendencia !== 0 && <span className={`text-xs ${part.tendencia > 0 ? "text-ok" : "text-err"}`}>{part.tendencia > 0 ? "↑" : "↓"} {Math.abs(part.tendencia)}</span>}
              </div>
              <div className="h-1.5 rounded-pilula bg-s3 overflow-hidden mt-2"><div className="h-full bg-ac" style={{ width: `${part.total}%` }} /></div>
            </>
          )}
          <dl className="grid grid-cols-4 gap-2 mt-3 text-center">
            {([["entrega", t.pEntrega], ["emDia", t.pEmDia], ["ritmo", t.pRitmo], ["uso", t.pUso]] as const).map(([k, label]) => (
              <div key={k}><dd className="text-sm font-medium tabular-nums">{part.partes[k] ?? "—"}</dd><dt className="text-xs text-t2">{label}</dt></div>
            ))}
          </dl>
          <p className="text-xs text-t3 mt-2">{t.participacaoNota}</p>
        </Cartao>
      )}
      {me.gestao && (
        <Cartao variante="pinu">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo-maiusculo inline-flex items-center gap-1 text-t3"><Icone nome="gerar-outra"  tamanho={12} className="text-info" />{t.estudoIA}</p>
            <form action={estudoAction}><input type="hidden" name="pessoa" value={p.id} />
              <BotaoEnviar enviando={t.processando} icone="gerar-outra" variante="tonal" tamanho="P">{estudo ? t.atualizarEstudo : t.estudarPessoa}</BotaoEnviar>
            </form>
          </div>
          {estudo ? (
            <>
              <p className="text-xs text-t3 mt-1">{t.geradoEm} {fmtDate(diaLocal(estudo.geradoEm), lang)}</p>
              <div className="mt-2"><Md>{estudo.texto}</Md></div>
              {estudo.sugestoes.length > 0 && (
                <div className="mt-3">
                  <p className="rotulo-maiusculo text-t3 mb-2">{t.tarefasSugeridas}</p>
                  <ul className="grid gap-2">
                    {estudo.sugestoes.map((s) => {
                      const x = semDono.find((y) => y.id === s.tarefa);
                      return x ? (
                        <li key={s.tarefa} className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="min-w-0 flex-1"><Link href={`/tarefas/${x.id}`} className="hover:underline">{x.title}</Link><p className="text-xs text-t2">{s.motivo}</p></div>
                          <form action={atribuirAction}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="pessoa" value={p.id} />
                            <BotaoEnviar enviando="…" icone="pessoa" variante="primario" tamanho="P">{t.atribuirA} {primeiro}</BotaoEnviar>
                          </form>
                        </li>
                      ) : <li key={s.tarefa} className="meta flex items-center gap-1.5 text-t3"><Icone nome="confirmar" tamanho={14} />{s.motivo}</li>;
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : <p className="text-sm text-t2 mt-2">{t.estudoAviso}</p>}
        </Cartao>
      )}
      {!me.gestao && abertas.length > 0 && <Cartao><p className="rotulo-maiusculo text-t3 mb-2">{t.proximasTarefas}</p>{lista(abertas.slice(0, 3))}</Cartao>}
    </div>
  );

  const tarefas = (
    <div className="pt-3">
      {(me.gestao || can.gerirPessoa(me, p)) && (
        <Link href={`/tarefas/nova?responsavel=${p.id}&back=/pessoas/${p.id}`} className="inline-flex items-center gap-1 anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4 mb-3"><Icone nome="mais"  tamanho={14} />{t.atribuirTarefa}</Link>
      )}
      {grupos.filter(([, ts]) => ts.length).map(([titulo, ts]) => (
        <section key={titulo} className="mb-4">
          <p className="rotulo-maiusculo text-t3 mb-2">{titulo} <span className="font-normal">({ts.length})</span></p>
          {lista(ts)}
        </section>
      ))}
      {!minhas.length && <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />}
    </div>
  );

  const perfil = (
    <div className="grid gap-3 pt-3">
      {me.pessoa?.id === p.id && (
        <Cartao className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="rotulo-maiusculo mb-0.5 text-t3">{t.idiomaPlataforma}</p>
            <p className="text-xs text-t2">{t.idiomaPlataformaAjuda}</p>
          </div>
          <form action={toggleLangAction} className="flex h-9 rounded-pilula bg-s2 p-0.5 text-sm font-medium">
            {(["pt", "en"] as const).map((l) => l === lang
              ? <span key={l} aria-current="true" className="flex items-center px-3 rounded-pilula bg-ac text-ac-ink">{l === "pt" ? "Português" : "English"}</span>
              : <button key={l} className="flex items-center px-3 rounded-pilula text-t2 hover:text-t1">{l === "pt" ? "Português" : "English"}</button>)}
          </form>
        </Cartao>
      )}
      <Cartao>
        <p className="rotulo-maiusculo text-t3 mb-2">{t.contato}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Campo k="WhatsApp" v={p.whatsapp && <span className="inline-flex flex-wrap items-center gap-2">
            <a className="underline" href={`https://wa.me/${digits(p.whatsapp)}`} target="_blank" rel="noreferrer">{p.whatsapp}</a>
            {p.whatsappVerificado ? <span className="inline-flex items-center gap-0.5 text-xs text-ok"><Icone nome="sucesso"  tamanho={12} />{t.verificado}</span>
              : <span className="inline-flex items-center gap-0.5 text-xs text-warn"><Icone nome="atencao"  tamanho={12} />{t.naoVerificado}</span>}
          </span>} />
          <Campo k={t.email} v={proprio && p.email && <a className="underline" href={`mailto:${p.email}`}>{p.email}</a>} />
          <Campo k={t.cidade} v={[p.cidade, p.pais].filter(Boolean).join(", ")} />
          <Campo k={t.idiomaPref} v={p.idioma && { pt: "Português", en: "English", es: "Español" }[p.idioma]} />
        </dl>
      </Cartao>
      {proprio && (p.dataNascimento || p.nacionalidade || p.emergenciaNome || p.emergenciaWhatsapp) && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2 inline-flex items-center gap-1"><Icone nome="cadeado"  tamanho={11} />{t.privadoLbl}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Campo k={t.dataNascimento} v={p.dataNascimento && p.dataNascimento.split("-").reverse().join("/")} />
            <Campo k={t.nacionalidade} v={p.nacionalidade} />
            <Campo k={t.emergencia} v={[p.emergenciaNome, p.emergenciaWhatsapp].filter(Boolean).join(" · ")} />
          </dl>
        </Cartao>
      )}
      {proprio && getDiagnosticos().filter((d) => participa(d, p)).map((d) => {
        const r = getRespostas(d.id, p.id);
        const pr = progresso(d, p.id);
        const cod = getColetivo(d.id).codigo;
        const aceite = cod.aceites[p.id];
        return (
          <Cartao key={d.id}>
            <div className="flex items-center justify-between gap-2"><p className="rotulo-maiusculo text-t3">{t.meuPapel}</p><span className="text-xs text-t3">{pr.respondidas}/{pr.total} · {t.privadoDiag}</span></div>
            {d.modelo.secoes.filter((x) => x.destino === "perfil").map((sec) => {
              const resp = sec.perguntas.filter((q) => r[q.id]?.texto);
              return resp.length ? (
                <details key={sec.id} className="mt-2">
                  <summary className="cursor-pointer text-sm">{lang === "en" ? sec.titulo_en : sec.titulo} <span className="text-xs text-t3">({resp.length}/{sec.perguntas.length})</span></summary>
                  <dl className="grid gap-2 text-sm mt-2">{resp.map((q) => <div key={q.id}><dt className="text-xs text-t2">{lang === "en" ? q.texto_en : q.texto}</dt><dd className="whitespace-pre-wrap">{r[q.id].texto}</dd></div>)}</dl>
                </details>
              ) : null;
            })}
            {cod.versao > 0 && (
              <p className="text-sm mt-2"><Link href={`/diagnosticos/${d.id}/codigo`} className="underline">{t.codigoAcordos}</Link> ({t.versao} {cod.versao}):{" "}
                {aceite?.versao === cod.versao ? <span className="inline-flex items-center gap-1 text-ok"><Icone nome="sucesso" tamanho={14} />{aceite.em.slice(0, 10).split("-").reverse().join("/")}</span> : <span className="inline-flex items-center gap-1 text-warn"><Icone nome="atencao" tamanho={14} />{t.pendenteAceite}</span>}
              </p>
            )}
            <Link href={`/pessoas/${p.id}/respostas?d=${d.id}`} className="inline-block text-sm underline mt-2">{me.pessoa?.id === p.id ? t.responderDiag : t.verRespostas} →</Link>
          </Cartao>
        );
      })}
      {p.dadosConfirmadosEm ? <p className="text-xs text-t3">{t.dadosConfirmados} {fmtDate(p.dadosConfirmadosEm, lang)}</p> : p.incompleta && <p className="text-xs text-warn">{t.fichaIncompleta}</p>}
    </div>
  );

  const gestao = (
    <div className="grid gap-3 pt-3">
      {links.map((l) => (
        <Cartao key={l.titulo}>
          <p className="rotulo-maiusculo text-t3 mb-2">{l.titulo}</p>
          {p.whatsapp ? (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <form action={enviarLinkAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="tipo" value={l.tipo} />
                <BotaoEnviar enviando="…" icone="enviar" variante="primario">{t.enviarWhatsNipei}</BotaoEnviar>
              </form>
              <span className="text-xs text-t3">{t.ou}</span>
              <a href={`https://wa.me/${digits(p.whatsapp)}?text=${encodeURIComponent(`${l.msg.replace("{nome}", primeiro)}\n${l.url}`)}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm underline"><Icone nome="mensagem"  tamanho={14} />{t.enviarWhats}</a>
            </div>
          ) : <p className="text-xs text-t2 mb-2">{t.semContato}</p>}
          <input readOnly value={l.url} aria-label={t.copiarLink} className={`${CAMPO_COMPACTO} w-full`} />
        </Cartao>
      ))}
      {gerir && !temAcesso && <p className="text-xs text-t2">{t.equipeSemAcesso}</p>}
      {enviados.length > 0 && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2">{t.notificacoesEnviadas}</p>
          <ul className="grid gap-2">
            {enviados.map((e, i) => (
              <li key={i} className="text-sm">
                <p className="text-xs text-t2">{fmtDate(diaLocal(e.em), lang)} {new Date(e.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })} · {e.por} · {t.notifTipos[e.tipo]}</p>
                <p className="line-clamp-2 whitespace-pre-wrap">{e.texto}</p>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {proprio && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2">{t.avisosWhats}</p>
          {!p.equipes.some((e) => equipes.find((x) => x.id === e)?.avisos) ? <p className="text-sm text-t2">{t.avisosSemEquipe}</p>
            : !p.whatsapp ? <p className="text-sm text-t2">{t.avisosSemFone}</p> : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={p.avisosWhatsapp ? "text-ok" : "text-t2"}>{p.avisosWhatsapp ? t.avisosLigados : t.avisosDesligados}</span>
              <form action={setAvisosPessoaAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="ligado" value={String(!p.avisosWhatsapp)} />
                <button className="anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s3 px-3.5 font-texto text-sm font-semibold text-t1 hover:bg-s4">{p.avisosWhatsapp ? t.desligarAvisos : t.ligarAvisos}</button>
              </form>
            </div>
          )}
        </Cartao>
      )}
      {me.gestao && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2">{t.acessoPlataforma}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {p.externo ? <span className="text-t2">{t.ehContatoExterno}</span>
              : p.suspenso ? <span className="inline-flex items-center gap-1.5 text-warn"><Icone nome="cadeado"  tamanho={14} />{t.acessoSuspensoTexto}</span>
              : <span className={temAcesso ? "text-ok" : "text-t2"}>{temAcesso ? t.acessoAtivoTexto : t.equipeSemAcesso}</span>}
            {!p.externo && p.id !== me.pessoa?.id && (
              <form action={suspensoAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="suspenso" value={String(!p.suspenso)} />
                <BotaoEnviar enviando="…" icone="cadeado" variante="tonal" tamanho="P">{p.suspenso ? t.reativarAcesso : t.suspenderAcesso}</BotaoEnviar>
              </form>
            )}
            <form action={externoAction} className="ml-auto">
              <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="externo" value={String(!p.externo)} />
              <BotaoEnviar enviando="…" icone="pessoa" variante="fantasma" tamanho="P">{p.externo ? t.voltarPessoa : t.marcarExterno}</BotaoEnviar>
            </form>
          </div>
          <p className="text-xs text-t2 mt-2">{t.suspensoAjuda}</p>
        </Cartao>
      )}
      {(me.gestao || podeAdicionar.length > 0) && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2">{t.equipes}</p>
          {p.equipes.length === 0 && !equipes.some((e) => e.coordenadores.includes(p.id)) && <p className="text-sm text-t2 mb-2">{t.semEquipeAinda}</p>}
          <ul className="grid gap-1 mb-3">
            {[...p.equipes, ...equipes.filter((e) => e.coordenadores.includes(p.id) && !p.equipes.includes(e.id)).map((e) => e.id)].map((id) => {
              const e = equipes.find((x) => x.id === id);
              if (!e) return null;
              const coord = e.coordenadores.includes(p.id);
              const membro = p.equipes.includes(id);
              return (
                <li key={id} className="flex flex-wrap items-center gap-2 py-1.5 border-b border-s2 last:border-0">
                  <span className="w-2 h-2 rounded-pilula shrink-0" style={{ background: e.cor }} />
                  <span className="text-sm flex-1 min-w-0">{e.nome}{e.gestao && <span className="ml-1.5 text-xs rounded bg-warn-bg text-warn px-1">{t.gestaoCompleta}</span>}</span>
                  <span className={`text-xs ${coord ? "text-t1 font-medium" : "text-t2"}`}>{coord ? (membro ? t.coordenacao : t.coordenacaoGeral) : t.membroLbl}</span>
                  {me.gestao && (
                    <>
                      <form action={coordenacaoAction}>
                        <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="equipe" value={id} /><input type="hidden" name="coordena" value={String(!coord)} />
                        <BotaoEnviar enviando="…" icone="pessoas" variante="tonal" tamanho="P">{coord ? t.tirarCoordenacao : t.tornarCoordenador}</BotaoEnviar>
                      </form>
                      {membro && !(e.gestao && p.id === me.pessoa?.id) && (
                        <form action={removerDaEquipeAction}>
                          <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="equipe" value={id} />
                          <ConfirmarBotao pergunta={t.confirmarRemover.replace("{nome}", primeiro).replace("{equipe}", e.nome) + (e.gestao ? ` ${t.perdeGestao}` : "")}
                            className="rounded-interno border text-err px-2 py-1 text-xs">{t.removerLbl}</ConfirmarBotao>
                        </form>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {podeAdicionar.length > 0 && (
            <EscolherEquipes pessoaId={p.id} equipes={podeAdicionar.filter((e) => !e.gestao || me.gestao)} t={t} comNota={false} />
          )}
        </Cartao>
      )}
      {gerir && mudancas.length > 0 && (
        <Cartao>
          <p className="rotulo-maiusculo text-t3 mb-2">{t.historicoPessoa}</p>
          <LinhaDoTempo itens={mudancas.map((h) => deAtividade({ quando: h.quando, quem: h.quem, texto: h.oque }, (d) => (d === hoje ? t.hoje : fmtDate(d, lang))))} />
        </Cartao>
      )}
      {me.gestao && <NotasInternas pessoaId={p.id} notas={getNotas(p.id)} t={t} />}
    </div>
  );

  return (
    <>
      <div className="-ml-3 mb-2"><Botao href="/pessoas" variante="fantasma" tamanho="P" icone="voltar">{t.pessoas}</Botao></div>

      <div className="flex items-start gap-4">
        <span className="mt-6 shrink-0"><AvatarDS nome={p.name} foto={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} tamanho={80} /></span>
        <div className="min-w-0 flex-1">
          <CabecalhoPagina selo="mao" rotulo={[p.apelido, p.nativeName, p.funcao].filter(Boolean).join(" · ") || p.nipeiId}
            titulo={<>{p.name}{p.suspenso && <Icone nome="cadeado" tamanho={28} aria-label={t.acessoSuspensoTexto} className="ml-2 inline align-middle text-warn" />}</>}
            acoes={<>
              {podeNotificar && (
                <Notificar pessoaId={p.id} nome={primeiro} remetente={(me.pessoa?.name ?? me.username).split(/[\s(]/)[0]} temWhats={!!p.whatsapp}
                  verificado={p.whatsappVerificado} desligou={!p.avisosWhatsapp}
                  labels={{ notificar: t.notificar, tipos: t.notifTipos, pedidoIA: t.pedidoIA, gerar: t.gerarMensagem, montar: t.montarTexto, mensagem: t.mensagem, previa: t.previa,
                    enviar: t.enviarWhatsNipei, confirmar: t.confirmarEnvio, cancelar: t.cancelar, enviada: t.enviada, semWhats: t.semWhatsNotif,
                    naoVerificado: t.avisoNaoVerificado, desligou: t.avisoDesligou, limites: t.limitesNotif }} />
              )}
              {p.whatsapp && <BotaoIcone icone="mensagem" aria-label="WhatsApp" tamanho={44} href={`https://wa.me/${digits(p.whatsapp)}`} />}
              {proprio && p.email && <BotaoIcone icone="enviar" aria-label={t.email} tamanho={44} href={`mailto:${p.email}`} />}
              {proprio && <BotaoIcone icone="editar" aria-label={t.editarPerfil} tamanho={44} href={`/pessoas/${p.id}/editar`} />}
            </>}
            filtros={<>
              {p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <ChipDS tipo={chaveEquipe(e.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(e.cor)} key={eid} href={`/equipes/${eid}`}>{e.nome}{p.coordena.includes(eid) ? ` · ${t.coordenacao}` : ""}</ChipDS>; })}
              {p.equipes.length === 0 && <span className="corpo text-t2">{t.semEquipe}</span>}
            </>} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Num v={n.abertas} label={t.abertasLbl} />
        <Num v={n.atrasadas} label={t.atrasadasLbl} alerta={n.atrasadas > 0} />
        <Num v={n.feitas30} label={t.feitas30} />
        <Num v={n.ultimoUso ? (n.ultimoUso === hoje ? t.hoje : fmtDate(n.ultimoUso, lang)) : "—"} label={t.ultimoUso} />
      </div>

      <AbasComPainel id="pessoa" inicial={(q.aba === "conexoes" || q.aba === "seguranca") && me.pessoa?.id === p.id ? q.aba : undefined} abas={[
        { id: "resumo", rotulo: t.resumoLbl, contagem: 0, conteudo: resumo },
        { id: "tarefas", rotulo: t.tarefasLbl, contagem: abertas.length, alerta: n.atrasadas > 0, conteudo: tarefas },
        { id: "perfil", rotulo: t.perfilLbl, contagem: 0, conteudo: perfil },
        { id: "sabemos", rotulo: t.oQueSabemos, contagem: sabemos.length, conteudo: <OQueSabemos fatos={sabemos} t={t} base={`/conhecimento?pessoa=${p.id}#base`} /> },
        ...(gerir || proprio || enviados.length ? [{ id: "gestao", rotulo: t.gestaoLbl, contagem: 0, conteudo: gestao }] : []),
        // only on one's own profile: nobody sees or touches someone else's connections
        ...(me.pessoa?.id === p.id && !me.vendoComo ? [{ id: "conexoes", rotulo: t.cx.aba, contagem: 0, conteudo: <Conexoes pessoaId={p.id} t={t} ok={q.google === "ok"} gestao={me.gestao} /> },
          { id: "seguranca", rotulo: t.sg.aba, contagem: 0, conteudo: <Seguranca p={p} t={t} ok={q.aba === "seguranca" ? q.ok : undefined} /> }] : []),
      ]} />
    </>
  );
}
