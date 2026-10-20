import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Mail, MessageCircle, Pencil } from "lucide-react";
import { Avatar, Chip, Section, Title } from "@/components/v2/ui";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getPessoas } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { addToEquipeAction, setAvisosPessoaAction } from "../../actions";
import { getColetivo, getDiagnosticos, getRespostas, participa, progresso } from "@/lib/v2/diagnostico";

const CADASTRO_TTL = 60 * 60 * 24 * 30;
const LOGIN_LINK_TTL = 60 * 60 * 24 * 7;
const digits = (n: string) => n.replace(/\D/g, "");

export default async function PessoaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getPessoas().find((x) => x.id === id);
  if (!p) notFound();
  const equipes = getEquipes();
  const gerir = can.gerirPessoa(me, p) || (p.equipes.length === 0 && me.gestao);
  const temAcesso = p.equipes.some((e) => equipes.find((x) => x.id === e)?.acesso);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const primeiro = p.name.split(" ")[0];
  // Links are generated on every visit and sent from the coordinator's own WhatsApp (wa.me): no message API needed.
  const links = gerir ? [
    { titulo: t.linkCadastro, url: `${origin}/cadastro?token=${signToken("cadastro", p.id, CADASTRO_TTL)}`, msg: t.msgCadastro },
    ...(temAcesso ? [{ titulo: t.linkAcesso, url: `${origin}/entrar?token=${signToken("login-link", p.id, LOGIN_LINK_TTL)}`, msg: t.msgAcesso }] : []),
  ] : [];
  const proprio = me.gestao || me.pessoa?.id === p.id; // private fields and "edit" only for the person and gestão
  const podeAdicionar = equipes.filter((e) => !p.equipes.includes(e.id) && can.gerirEquipe(me, e.id));

  return (
    <>
      <Link href="/pessoas" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.pessoas}</Link>
      <div className="flex items-center gap-4 mb-5">
        <Avatar name={p.name} size={56} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.dadosConfirmadosEm)}` : undefined} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="text-sm text-neutral-500"><span className="font-mono">{p.nipeiId}</span>{p.apelido && ` · ${p.apelido}`}{p.nativeName && ` · ${p.nativeName}`}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <Chip key={eid} href={`/equipes/${eid}`} cor={e.cor}>{e.nome}{p.coordena.includes(eid) ? ` · ${t.coordenacao}` : ""}</Chip>; })}
        {p.equipes.length === 0 && <span className="text-sm text-neutral-500">{t.semEquipe}</span>}
      </div>

      {proprio && (
        <Link href={`/pessoas/${p.id}/editar`} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm mb-5">
          <Pencil size={14} />{me.pessoa?.id === p.id ? t.editarDados : t.editarPerfil}
        </Link>
      )}

      <Section title={t.cadastroTitulo}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {p.whatsapp && <><dt className="text-neutral-500">WhatsApp</dt><dd className="flex flex-wrap items-center gap-2">
            <a className="inline-flex items-center gap-1 underline" href={`https://wa.me/${digits(p.whatsapp)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} />{p.whatsapp}</a>
            {p.whatsappVerificado ? <span className="inline-flex items-center gap-0.5 text-xs text-green-700 dark:text-green-400"><CheckCircle2 size={12} />{t.verificado}</span>
              : <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle size={12} />{t.naoVerificado}</span>}
          </dd></>}
          {proprio && p.email && <><dt className="text-neutral-500">{t.email}</dt><dd><a className="inline-flex items-center gap-1 underline" href={`mailto:${p.email}`}><Mail size={14} />{p.email}</a></dd></>}
          {(p.cidade || p.pais) && <><dt className="text-neutral-500">{t.cidade}</dt><dd>{[p.cidade, p.pais].filter(Boolean).join(", ")}</dd></>}
          {proprio && p.dataNascimento && <><dt className="text-neutral-500">{t.dataNascimento}</dt><dd>{p.dataNascimento.split("-").reverse().join("/")}</dd></>}
          {proprio && p.nacionalidade && <><dt className="text-neutral-500">{t.nacionalidade}</dt><dd>{p.nacionalidade}</dd></>}
          {proprio && (p.emergenciaNome || p.emergenciaWhatsapp) && <><dt className="text-neutral-500">{t.emergencia}</dt><dd>{[p.emergenciaNome, p.emergenciaWhatsapp].filter(Boolean).join(" · ")}</dd></>}
          {p.area && <><dt className="text-neutral-500">{t.area}</dt><dd>{p.area}</dd></>}
          {p.funcao && <><dt className="text-neutral-500">{t.funcao}</dt><dd>{p.funcao}</dd></>}
          {p.disponibilidade && <><dt className="text-neutral-500">{t.disponibilidade}</dt><dd>{p.disponibilidade}</dd></>}
          {p.dadosConfirmadosEm ? <><dt className="text-neutral-500">{t.dadosConfirmados}</dt><dd>{fmtDate(p.dadosConfirmadosEm, lang)}</dd></>
            : p.cadastroEm && <><dt className="text-neutral-500">{t.cadastradoEm}</dt><dd>{fmtDate(p.cadastroEm, lang)}</dd></>}
        </dl>
        {p.incompleta && <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">{t.fichaIncompleta}</p>}
      </Section>

      {proprio && getDiagnosticos().filter((d) => participa(d, p)).map((d) => {
        const r = getRespostas(d.id, p.id);
        const pr = progresso(d, p.id);
        const perfil = d.modelo.secoes.filter((x) => x.destino === "perfil");
        return (
          <Section key={d.id} title={t.meuPapel}>
            <p className="text-xs text-neutral-500 mb-3">{d.titulo} · {pr.respondidas}/{pr.total} {t.respondidas} · {t.privadoDiag}</p>
            {perfil.map((sec) => (
              <div key={sec.id} className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{lang === "en" ? sec.titulo_en : sec.titulo}</p>
                <dl className="grid gap-2 text-sm">
                  {sec.perguntas.filter((q) => r[q.id]?.texto).map((q) => (
                    <div key={q.id}><dt className="text-neutral-500">{lang === "en" ? q.texto_en : q.texto}</dt><dd className="whitespace-pre-wrap">{r[q.id].texto}</dd></div>
                  ))}
                </dl>
                {!sec.perguntas.some((q) => r[q.id]?.texto) && <p className="text-sm text-neutral-400">{t.vazio}</p>}
              </div>
            ))}
            {(() => {
              const cod = getColetivo(d.id).codigo;
              if (!cod.versao) return null;
              const a = cod.aceites[p.id];
              return (
                <p className="text-sm mb-3">
                  <Link href={`/diagnosticos/${d.id}/codigo`} className="underline">{t.codigoAcordos}</Link> ({t.versao} {cod.versao}):{" "}
                  {a?.versao === cod.versao ? <span className="text-green-700 dark:text-green-400">✅ {t.aceitoEm} {a.em.slice(0, 10).split("-").reverse().join("/")}</span>
                    : <span className="text-amber-700 dark:text-amber-400">⚠️ {t.pendenteAceite}</span>}
                </p>
              );
            })()}
            <Link href={`/pessoas/${p.id}/respostas?d=${d.id}`} className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">
              {me.pessoa?.id === p.id ? t.responderDiag : t.verRespostas} →
            </Link>
          </Section>
        );
      })}

      {links.map((l) => (
        <Section key={l.titulo} title={l.titulo}>
          {p.whatsapp ? (
            <a href={`https://wa.me/${digits(p.whatsapp)}?text=${encodeURIComponent(`${l.msg.replace("{nome}", primeiro)}\n${l.url}`)}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium mb-3"><MessageCircle size={16} />{t.enviarWhats}</a>
          ) : <p className="text-xs text-neutral-500 mb-2">{t.semContato}</p>}
          <p className="text-xs text-neutral-500 mb-1">{t.copiarLink}</p>
          <input readOnly value={l.url} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono" />
        </Section>
      ))}
      {gerir && !temAcesso && <p className="text-xs text-neutral-500 mb-6">{t.equipeSemAcesso}</p>}

      {proprio && (
        <Section title={t.avisosWhats}>
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
        </Section>
      )}

      {podeAdicionar.length > 0 && (
        <Section title={t.ativarEm}>
          <form action={addToEquipeAction} className="flex items-center gap-2">
            <input type="hidden" name="pessoa" value={p.id} />
            <select name="equipe" className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm">
              {podeAdicionar.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <button className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm">{t.adicionar}</button>
          </form>
        </Section>
      )}
    </>
  );
}
