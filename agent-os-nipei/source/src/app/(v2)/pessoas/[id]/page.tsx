import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Mail, MessageCircle, Pencil, Plus, Sparkles } from "lucide-react";
import { Avatar, Chip, Empty, TaskRow } from "@/components/v2/ui";
import Abas from "@/components/v2/Abas";
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
import { diaLocal } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { atribuirAction, coordenacaoAction, enviarLinkAction, estudoAction, externoAction, removerDaEquipeAction, setAvisosPessoaAction, suspensoAction, toggleLangAction } from "../../actions";
import ConfirmarBotao from "@/components/v2/ConfirmarBotao";
import EscolherEquipes from "@/components/v2/EscolherEquipes";
import NotasInternas from "@/components/v2/NotasInternas";
import { getNotas } from "@/lib/v2/notasInternas";

const CADASTRO_TTL = 60 * 60 * 24 * 30;
const LOGIN_LINK_TTL = 60 * 60 * 24 * 7;
const digits = (n: string) => n.replace(/\D/g, "");
const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";
const ROTULO = "text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2";

// A person's profile in tabs: Resumo (numbers, and for gestão Participação + AI study), Tarefas,
// Perfil (details, role from the assessment) and Gestão (links, notices, teams).
export default async function PessoaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getPessoas().find((x) => x.id === id);
  if (!p) notFound();
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
    ) : <Empty>{t.nadaPendente}</Empty>;
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
    <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 px-2 py-2 text-center">
      <p className={`text-lg font-semibold tabular-nums leading-tight ${alerta ? "text-red-600 dark:text-red-400" : ""}`}>{v}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
  const Campo = ({ k, v }: { k: string; v?: React.ReactNode }) => v ? <div><dt className="text-xs text-neutral-500">{k}</dt><dd className="text-sm">{v}</dd></div> : null;

  // ---------------- tabs
  const resumo = (
    <div className="grid gap-3 pt-3">
      {(p.funcao || p.area || p.disponibilidade) && (
        <div className={CARTAO}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Campo k={t.funcaoLbl} v={p.funcao} /><Campo k={t.areaLbl} v={p.area} /><Campo k={t.dispLbl} v={p.disponibilidade} />
          </dl>
        </div>
      )}
      {part && (
        <div className={CARTAO}>
          <div className="flex items-center justify-between"><p className={ROTULO + " mb-0"}>{t.participacao}</p><span className="inline-flex items-center gap-1 text-[11px] text-neutral-400"><Lock size={11} />{t.soGestao}</span></div>
          {part.total == null ? <p className="text-sm text-neutral-500 mt-2">{t.dadosInsuficientes}</p> : (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-semibold tabular-nums ${NIVEL_COR[part.nivel]}`}>{part.total}</span>
                <span className="text-sm text-neutral-500">{part.nivel === "alta" ? t.nivelAlta : part.nivel === "media" ? t.nivelMedia : t.nivelBaixa}</span>
                {part.tendencia != null && part.tendencia !== 0 && <span className={`text-xs ${part.tendencia > 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{part.tendencia > 0 ? "↑" : "↓"} {Math.abs(part.tendencia)}</span>}
              </div>
              <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mt-2"><div className="h-full bg-sky-600 dark:bg-sky-400" style={{ width: `${part.total}%` }} /></div>
            </>
          )}
          <dl className="grid grid-cols-4 gap-2 mt-3 text-center">
            {([["entrega", t.pEntrega], ["emDia", t.pEmDia], ["ritmo", t.pRitmo], ["uso", t.pUso]] as const).map(([k, label]) => (
              <div key={k}><dd className="text-sm font-medium tabular-nums">{part.partes[k] ?? "—"}</dd><dt className="text-[11px] text-neutral-500">{label}</dt></div>
            ))}
          </dl>
          <p className="text-[11px] text-neutral-400 mt-2">{t.participacaoNota}</p>
        </div>
      )}
      {me.gestao && (
        <div className={`${CARTAO} border-dashed`}>
          <div className="flex items-center justify-between gap-2">
            <p className={ROTULO + " mb-0 inline-flex items-center gap-1"}><Sparkles size={12} className="text-sky-600 dark:text-sky-400" />{t.estudoIA}</p>
            <form action={estudoAction}><input type="hidden" name="pessoa" value={p.id} />
              <BotaoEnviar enviando={t.processando} className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs">{estudo ? t.atualizarEstudo : t.estudarPessoa}</BotaoEnviar>
            </form>
          </div>
          {estudo ? (
            <>
              <p className="text-[11px] text-neutral-400 mt-1">{t.geradoEm} {fmtDate(diaLocal(estudo.geradoEm), lang)}</p>
              <div className="mt-2"><Md>{estudo.texto}</Md></div>
              {estudo.sugestoes.length > 0 && (
                <div className="mt-3">
                  <p className={ROTULO}>{t.tarefasSugeridas}</p>
                  <ul className="grid gap-2">
                    {estudo.sugestoes.map((s) => {
                      const x = semDono.find((y) => y.id === s.tarefa);
                      return x ? (
                        <li key={s.tarefa} className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="min-w-0 flex-1"><Link href={`/tarefas/${x.id}`} className="hover:underline">{x.title}</Link><p className="text-xs text-neutral-500">{s.motivo}</p></div>
                          <form action={atribuirAction}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="pessoa" value={p.id} />
                            <BotaoEnviar enviando="…" className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs">{t.atribuirA} {primeiro}</BotaoEnviar>
                          </form>
                        </li>
                      ) : <li key={s.tarefa} className="text-xs text-neutral-400">✓ {s.motivo}</li>;
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : <p className="text-sm text-neutral-500 mt-2">{t.estudoAviso}</p>}
        </div>
      )}
      {!me.gestao && abertas.length > 0 && <div className={CARTAO}><p className={ROTULO}>{t.proximasTarefas}</p>{lista(abertas.slice(0, 3))}</div>}
    </div>
  );

  const tarefas = (
    <div className="pt-3">
      {(me.gestao || can.gerirPessoa(me, p)) && (
        <Link href={`/tarefas/nova?responsavel=${p.id}&back=/pessoas/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm mb-3"><Plus size={14} />{t.atribuirTarefa}</Link>
      )}
      {grupos.filter(([, ts]) => ts.length).map(([titulo, ts]) => (
        <section key={titulo} className="mb-4">
          <p className={ROTULO}>{titulo} <span className="font-normal">({ts.length})</span></p>
          {lista(ts)}
        </section>
      ))}
      {!minhas.length && <Empty>{t.nadaPendente}</Empty>}
    </div>
  );

  const perfil = (
    <div className="grid gap-3 pt-3">
      {me.pessoa?.id === p.id && (
        <div className={`${CARTAO} flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <p className={ROTULO + " !mb-0.5"}>{t.idiomaPlataforma}</p>
            <p className="text-xs text-neutral-500">{t.idiomaPlataformaAjuda}</p>
          </div>
          <form action={toggleLangAction} className="flex h-9 rounded-full border border-neutral-300 dark:border-neutral-700 p-0.5 text-sm font-medium">
            {(["pt", "en"] as const).map((l) => l === lang
              ? <span key={l} aria-current="true" className="flex items-center px-3 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">{l === "pt" ? "Português" : "English"}</span>
              : <button key={l} className="flex items-center px-3 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white">{l === "pt" ? "Português" : "English"}</button>)}
          </form>
        </div>
      )}
      <div className={CARTAO}>
        <p className={ROTULO}>{t.contato}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Campo k="WhatsApp" v={p.whatsapp && <span className="inline-flex flex-wrap items-center gap-2">
            <a className="underline" href={`https://wa.me/${digits(p.whatsapp)}`} target="_blank" rel="noreferrer">{p.whatsapp}</a>
            {p.whatsappVerificado ? <span className="inline-flex items-center gap-0.5 text-xs text-green-700 dark:text-green-400"><CheckCircle2 size={12} />{t.verificado}</span>
              : <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle size={12} />{t.naoVerificado}</span>}
          </span>} />
          <Campo k={t.email} v={proprio && p.email && <a className="underline" href={`mailto:${p.email}`}>{p.email}</a>} />
          <Campo k={t.cidade} v={[p.cidade, p.pais].filter(Boolean).join(", ")} />
          <Campo k={t.idiomaPref} v={p.idioma && { pt: "Português", en: "English", es: "Español" }[p.idioma]} />
        </dl>
      </div>
      {proprio && (p.dataNascimento || p.nacionalidade || p.emergenciaNome || p.emergenciaWhatsapp) && (
        <div className={CARTAO}>
          <p className={`${ROTULO} inline-flex items-center gap-1`}><Lock size={11} />{t.privadoLbl}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Campo k={t.dataNascimento} v={p.dataNascimento && p.dataNascimento.split("-").reverse().join("/")} />
            <Campo k={t.nacionalidade} v={p.nacionalidade} />
            <Campo k={t.emergencia} v={[p.emergenciaNome, p.emergenciaWhatsapp].filter(Boolean).join(" · ")} />
          </dl>
        </div>
      )}
      {proprio && getDiagnosticos().filter((d) => participa(d, p)).map((d) => {
        const r = getRespostas(d.id, p.id);
        const pr = progresso(d, p.id);
        const cod = getColetivo(d.id).codigo;
        const aceite = cod.aceites[p.id];
        return (
          <div key={d.id} className={CARTAO}>
            <div className="flex items-center justify-between gap-2"><p className={ROTULO + " mb-0"}>{t.meuPapel}</p><span className="text-[11px] text-neutral-400">{pr.respondidas}/{pr.total} · {t.privadoDiag}</span></div>
            {d.modelo.secoes.filter((x) => x.destino === "perfil").map((sec) => {
              const resp = sec.perguntas.filter((q) => r[q.id]?.texto);
              return resp.length ? (
                <details key={sec.id} className="mt-2">
                  <summary className="cursor-pointer text-sm">{lang === "en" ? sec.titulo_en : sec.titulo} <span className="text-xs text-neutral-400">({resp.length}/{sec.perguntas.length})</span></summary>
                  <dl className="grid gap-2 text-sm mt-2">{resp.map((q) => <div key={q.id}><dt className="text-xs text-neutral-500">{lang === "en" ? q.texto_en : q.texto}</dt><dd className="whitespace-pre-wrap">{r[q.id].texto}</dd></div>)}</dl>
                </details>
              ) : null;
            })}
            {cod.versao > 0 && (
              <p className="text-sm mt-2"><Link href={`/diagnosticos/${d.id}/codigo`} className="underline">{t.codigoAcordos}</Link> ({t.versao} {cod.versao}):{" "}
                {aceite?.versao === cod.versao ? <span className="text-green-700 dark:text-green-400">✅ {aceite.em.slice(0, 10).split("-").reverse().join("/")}</span> : <span className="text-amber-700 dark:text-amber-400">⚠️ {t.pendenteAceite}</span>}
              </p>
            )}
            <Link href={`/pessoas/${p.id}/respostas?d=${d.id}`} className="inline-block text-sm underline mt-2">{me.pessoa?.id === p.id ? t.responderDiag : t.verRespostas} →</Link>
          </div>
        );
      })}
      {p.dadosConfirmadosEm ? <p className="text-xs text-neutral-400">{t.dadosConfirmados} {fmtDate(p.dadosConfirmadosEm, lang)}</p> : p.incompleta && <p className="text-xs text-amber-700 dark:text-amber-400">{t.fichaIncompleta}</p>}
    </div>
  );

  const gestao = (
    <div className="grid gap-3 pt-3">
      {links.map((l) => (
        <div key={l.titulo} className={CARTAO}>
          <p className={ROTULO}>{l.titulo}</p>
          {p.whatsapp ? (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <form action={enviarLinkAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="tipo" value={l.tipo} />
                <BotaoEnviar enviando="…" className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium">{t.enviarWhatsNipei}</BotaoEnviar>
              </form>
              <span className="text-xs text-neutral-400">{t.ou}</span>
              <a href={`https://wa.me/${digits(p.whatsapp)}?text=${encodeURIComponent(`${l.msg.replace("{nome}", primeiro)}\n${l.url}`)}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm underline"><MessageCircle size={14} />{t.enviarWhats}</a>
            </div>
          ) : <p className="text-xs text-neutral-500 mb-2">{t.semContato}</p>}
          <input readOnly value={l.url} aria-label={t.copiarLink} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono" />
        </div>
      ))}
      {gerir && !temAcesso && <p className="text-xs text-neutral-500">{t.equipeSemAcesso}</p>}
      {enviados.length > 0 && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.notificacoesEnviadas}</p>
          <ul className="grid gap-2">
            {enviados.map((e, i) => (
              <li key={i} className="text-sm">
                <p className="text-xs text-neutral-500">{fmtDate(diaLocal(e.em), lang)} {new Date(e.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })} · {e.por} · {t.notifTipos[e.tipo]}</p>
                <p className="line-clamp-2 whitespace-pre-wrap">{e.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {proprio && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.avisosWhats}</p>
          {!p.equipes.some((e) => equipes.find((x) => x.id === e)?.avisos) ? <p className="text-sm text-neutral-500">{t.avisosSemEquipe}</p>
            : !p.whatsapp ? <p className="text-sm text-neutral-500">{t.avisosSemFone}</p> : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={p.avisosWhatsapp ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>{p.avisosWhatsapp ? t.avisosLigados : t.avisosDesligados}</span>
              <form action={setAvisosPessoaAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="ligado" value={String(!p.avisosWhatsapp)} />
                <button className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs">{p.avisosWhatsapp ? t.desligarAvisos : t.ligarAvisos}</button>
              </form>
            </div>
          )}
        </div>
      )}
      {me.gestao && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.acessoPlataforma}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {p.externo ? <span className="text-neutral-500">{t.ehContatoExterno}</span>
              : p.suspenso ? <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><Lock size={14} />{t.acessoSuspensoTexto}</span>
              : <span className={temAcesso ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>{temAcesso ? t.acessoAtivoTexto : t.equipeSemAcesso}</span>}
            {!p.externo && p.id !== me.pessoa?.id && (
              <form action={suspensoAction}>
                <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="suspenso" value={String(!p.suspenso)} />
                <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs">{p.suspenso ? t.reativarAcesso : t.suspenderAcesso}</BotaoEnviar>
              </form>
            )}
            <form action={externoAction} className="ml-auto">
              <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="externo" value={String(!p.externo)} />
              <BotaoEnviar enviando="…" className="text-xs underline text-neutral-500">{p.externo ? t.voltarPessoa : t.marcarExterno}</BotaoEnviar>
            </form>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">{t.suspensoAjuda}</p>
        </div>
      )}
      {(me.gestao || podeAdicionar.length > 0) && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.equipes}</p>
          {p.equipes.length === 0 && !equipes.some((e) => e.coordenadores.includes(p.id)) && <p className="text-sm text-neutral-500 mb-2">{t.semEquipeAinda}</p>}
          <ul className="grid gap-1 mb-3">
            {[...p.equipes, ...equipes.filter((e) => e.coordenadores.includes(p.id) && !p.equipes.includes(e.id)).map((e) => e.id)].map((id) => {
              const e = equipes.find((x) => x.id === id);
              if (!e) return null;
              const coord = e.coordenadores.includes(p.id);
              const membro = p.equipes.includes(id);
              return (
                <li key={id} className="flex flex-wrap items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.cor }} />
                  <span className="text-sm flex-1 min-w-0">{e.nome}{e.gestao && <span className="ml-1.5 text-[10px] rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1">{t.gestaoCompleta}</span>}</span>
                  <span className={`text-xs ${coord ? "text-neutral-800 dark:text-neutral-200 font-medium" : "text-neutral-500"}`}>{coord ? (membro ? t.coordenacao : t.coordenacaoGeral) : t.membroLbl}</span>
                  {me.gestao && (
                    <>
                      <form action={coordenacaoAction}>
                        <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="equipe" value={id} /><input type="hidden" name="coordena" value={String(!coord)} />
                        <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs">{coord ? t.tirarCoordenacao : t.tornarCoordenador}</BotaoEnviar>
                      </form>
                      {membro && !(e.gestao && p.id === me.pessoa?.id) && (
                        <form action={removerDaEquipeAction}>
                          <input type="hidden" name="pessoa" value={p.id} /><input type="hidden" name="equipe" value={id} />
                          <ConfirmarBotao pergunta={t.confirmarRemover.replace("{nome}", primeiro).replace("{equipe}", e.nome) + (e.gestao ? ` ${t.perdeGestao}` : "")}
                            className="rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 px-2 py-1 text-xs">{t.removerLbl}</ConfirmarBotao>
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
        </div>
      )}
      {gerir && mudancas.length > 0 && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.historicoPessoa}</p>
          <ul className="grid gap-1.5">
            {mudancas.map((h, i) => (
              <li key={i} className="text-sm flex flex-wrap gap-x-2">
                <span className="text-xs text-neutral-500 tabular-nums">{h.quando}</span>
                <span className="text-xs text-neutral-500">{h.quem}</span>
                <span className="basis-full sm:basis-auto">{h.oque}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {me.gestao && <NotasInternas pessoaId={p.id} notas={getNotas(p.id)} t={t} />}
    </div>
  );

  return (
    <>
      <Link href="/pessoas" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.pessoas}</Link>

      <div className="flex items-center gap-4">
        <Avatar name={p.name} size={60} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight truncate">{p.name}{p.suspenso && <span title={t.acessoSuspensoTexto} className="inline-flex align-middle ml-2 text-amber-600 dark:text-amber-400"><Lock size={16} /></span>}</h1>
          <p className="text-sm text-neutral-500 truncate">{[p.apelido, p.nativeName, p.funcao].filter(Boolean).join(" · ") || p.nipeiId}</p>
        </div>
        <div className="flex gap-1.5">
          {podeNotificar && (
            <Notificar pessoaId={p.id} nome={primeiro} remetente={(me.pessoa?.name ?? me.username).split(/[\s(]/)[0]} temWhats={!!p.whatsapp}
              verificado={p.whatsappVerificado} desligou={!p.avisosWhatsapp}
              labels={{ notificar: t.notificar, tipos: t.notifTipos, pedidoIA: t.pedidoIA, gerar: t.gerarMensagem, montar: t.montarTexto, mensagem: t.mensagem, previa: t.previa,
                enviar: t.enviarWhatsNipei, confirmar: t.confirmarEnvio, cancelar: t.cancelar, enviada: t.enviada, semWhats: t.semWhatsNotif,
                naoVerificado: t.avisoNaoVerificado, desligou: t.avisoDesligou, limites: t.limitesNotif }} />
          )}
          {p.whatsapp && <a href={`https://wa.me/${digits(p.whatsapp)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center hover:text-green-600"><MessageCircle size={16} /></a>}
          {proprio && p.email && <a href={`mailto:${p.email}`} aria-label={t.email} className="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center"><Mail size={16} /></a>}
          {proprio && <Link href={`/pessoas/${p.id}/editar`} aria-label={t.editarPerfil} className="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center"><Pencil size={15} /></Link>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <Chip key={eid} href={`/equipes/${eid}`} cor={e.cor}>{e.nome}{p.coordena.includes(eid) ? ` · ${t.coordenacao}` : ""}</Chip>; })}
        {p.equipes.length === 0 && <span className="text-sm text-neutral-500">{t.semEquipe}</span>}
      </div>

      <div className="grid grid-cols-4 gap-2 my-4">
        <Num v={n.abertas} label={t.abertasLbl} />
        <Num v={n.atrasadas} label={t.atrasadasLbl} alerta={n.atrasadas > 0} />
        <Num v={n.feitas30} label={t.feitas30} />
        <Num v={n.ultimoUso ? (n.ultimoUso === hoje ? t.hoje : fmtDate(n.ultimoUso, lang)) : "—"} label={t.ultimoUso} />
      </div>

      <Abas id="pessoa" abas={[
        { id: "resumo", label: t.resumoLbl, count: 0, conteudo: resumo },
        { id: "tarefas", label: t.tarefasLbl, count: abertas.length, alerta: n.atrasadas > 0, conteudo: tarefas },
        { id: "perfil", label: t.perfilLbl, count: 0, conteudo: perfil },
        ...(gerir || proprio || enviados.length ? [{ id: "gestao", label: `🔒 ${t.gestaoLbl}`, count: 0, conteudo: gestao }] : []),
      ]} />
    </>
  );
}
