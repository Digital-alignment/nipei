import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Empty, Section, Title } from "@/components/v2/ui";
import { currentUser } from "@/lib/v2/data";
import { diaLocal, getFatos, podeRevisar, type StatusFato } from "@/lib/v2/conhecimento";
import { getAlertas, type Alerta } from "@/lib/v2/auditor";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { auditarAgoraAction, resolverAlertaAction } from "../../actions";

const small = "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs";
const COR: Record<Alerta["tipo"], string> = {
  contradicao: "text-red-600 dark:text-red-400", ja_corrigido: "text-amber-700 dark:text-amber-400",
  duplicado: "text-neutral-500", desatualizado: "text-amber-700 dark:text-amber-400",
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
  const acaoTxt: Record<string, string> = { substituir: t.acaoSubstituir, eliminar: t.acaoEliminar, editar: t.acaoEditar, manter: t.acaoManter };

  // which buttons each kind of alert offers (labels follow what the decision means for that kind)
  const botoes = (a: Alerta): [string, string][] =>
    a.tipo === "desatualizado" ? [["manter", t.acaoAindaVale], ["eliminar", t.acaoEliminarFato]]
      : a.tipo === "contradicao" ? [["substituir", t.acaoSubstituir], ["eliminar", t.acaoEliminar], ["manter", t.acaoManter]]
        : [["eliminar", t.acaoEliminar], ["substituir", t.acaoConfirmarMesmo]];

  return (
    <>
      <Link href="/conhecimento" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.conhecimento}</Link>
      <Title sub={t.alertasIntro}>{t.alertas}</Title>
      {me.gestao && (
        <form action={auditarAgoraAction} className="mb-5"><button className={small}>{t.auditarAgora}</button></form>
      )}

      {abertas.length === 0 ? <Empty>{t.semAlertas}</Empty> : (
        <ul className="grid gap-4 mb-8">
          {abertas.map((a) => {
            const f = fato(a.fato);
            return (
              <li key={a.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${COR[a.tipo]}`}>{t.tiposAlerta[a.tipo]}</p>
                <p className="text-sm mt-1 mb-3">{a.explicacao}</p>
                {f && (
                  <div className="text-sm mb-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-400">{t.fatoNovo} · {statusTxt[f.status]}</p>
                    <p>{f.texto} <Link href={`/conhecimento/${f.fonte}`} className="text-neutral-400 inline-flex"><ExternalLink size={12} /></Link></p>
                  </div>
                )}
                {a.outros.map((id) => fato(id)).filter(Boolean).map((o) => (
                  <div key={o!.id} className="text-sm mb-2 pl-3 border-l-2 border-neutral-200 dark:border-neutral-700">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-400">{t.comparadoCom} · {statusTxt[o!.status]}{o!.revisadoPor && ` · ${o!.revisadoPor}`}</p>
                    <p>{o!.texto} <Link href={`/conhecimento/${o!.fonte}`} className="text-neutral-400 inline-flex"><ExternalLink size={12} /></Link></p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 mt-3">
                  {botoes(a).map(([acao, label]) => (
                    <form key={acao} action={resolverAlertaAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button name="acao" value={acao} className={small}>{label}</button>
                    </form>
                  ))}
                </div>
                {f && (
                  <form action={resolverAlertaAction} className="grid gap-2 mt-3">
                    <input type="hidden" name="id" value={a.id} />
                    {a.sugestao && <p className="text-xs text-neutral-500">{t.sugestaoIA}:</p>}
                    <textarea name="texto" defaultValue={a.sugestao || f.texto} rows={2} maxLength={600}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" />
                    <button name="acao" value="editar" className={`${small} justify-self-start`}>{t.acaoEditar}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {resolvidas.length > 0 && (
        <Section title={t.resolvidas}>
          <ul className="grid gap-2 text-sm">
            {resolvidas.map((a) => (
              <li key={a.id} className="text-neutral-500">
                <span className={COR[a.tipo]}>{t.tiposAlerta[a.tipo]}</span> · {fato(a.fato)?.texto.slice(0, 90)} → {acaoTxt[a.resolucao] ?? a.resolucao} · {a.resolvidoPor} · {fmtDate(diaLocal(a.resolvidoEm), lang)}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
