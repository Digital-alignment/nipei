import Link from "next/link";
import Selo from "@/components/ds/Selo";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import ChipDS from "@/components/ds/Chip";
import { notFound } from "next/navigation";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import PrazoRapido from "@/components/v2/PrazoRapido";
import { currentUser, getTarefas, responsaveisPara, today } from "@/lib/v2/data";
import { pulso } from "@/lib/v2/hoje";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { atribuirAction } from "../actions";

// Pulso da equipe (gestão): per team, overdue and owner-less tasks, fixed in place (owner, due date).
export default async function Pulso({ searchParams }: { searchParams: Promise<{ equipe?: string; ver?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const p = pulso();
  const hoje = today();
  const ver = q.ver === "atrasadas" ? "atrasadas" : "semdono";
  const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.maisSemana, data: dia(7) }, { label: t.esteMes, data: dia(30) }];
  const tarefas = getTarefas().filter((x) => x.status !== "done" && (q.equipe === undefined || x.equipe === q.equipe)
    && (ver === "atrasadas" ? x.prazo && x.prazo < hoje : !x.responsaveis.length))
    .sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999")).slice(0, 80);
  const url = (o: Record<string, string | undefined>) => "/pulso?" + new URLSearchParams(Object.entries({ equipe: q.equipe, ver, ...o }).filter(([, v]) => v !== undefined) as [string, string][]);

  return (
    <div className="max-w-3xl mx-auto">
      <CabecalhoPagina titulo={<>{t.pulso}</>} subtitulo={t.pulsoIntro} />

      <table className="w-full text-sm mb-6">
        <thead><tr className="text-xs text-t2 text-left"><th className="font-normal py-1"></th><th className="font-normal text-right">{t.tarefasAbertasLbl}</th><th className="font-normal text-right">{t.atrasadasLbl}</th><th className="font-normal text-right">{t.semDonoLbl}</th></tr></thead>
        <tbody>
          {p.linhas.map((l) => (
            <tr key={l.id || "sem"} className="border-t border-s2">
              <td className="py-1.5"><Link href={url({ equipe: l.id })} className="inline-flex items-center gap-1.5 hover:underline">{chaveEquipe(l.id) && <Selo nome={EQUIPES_DS[chaveEquipe(l.id)!].selo} tamanho={16} className="shrink-0" style={{ color: EQUIPES_DS[chaveEquipe(l.id)!].cor }} />}{l.nome || t.semEquipeLbl}</Link></td>
              <td className="text-right tabular-nums">{l.abertas}</td>
              <td className={`text-right tabular-nums ${l.atrasadas ? "text-err" : ""}`}><Link href={url({ equipe: l.id, ver: "atrasadas" })}>{l.atrasadas}</Link></td>
              <td className={`text-right tabular-nums ${l.semDono ? "text-warn" : ""}`}><Link href={url({ equipe: l.id, ver: "semdono" })}>{l.semDono}</Link></td>
            </tr>
          ))}
          <tr className="border-t font-medium"><td className="py-1.5">Total</td><td className="text-right tabular-nums">{p.abertas}</td><td className="text-right tabular-nums">{p.atrasadas}</td><td className="text-right tabular-nums">{p.semDono}</td></tr>
        </tbody>
      </table>

      <div className="flex flex-wrap gap-2 mb-3">
        <ChipDS ativo={ver === "semdono"} href={url({ ver: "semdono" })}>{t.semDonoLbl} ({p.semDono})</ChipDS>
        <ChipDS ativo={ver === "atrasadas"} href={url({ ver: "atrasadas" })}>{t.atrasadasLbl} ({p.atrasadas})</ChipDS>
        {q.equipe !== undefined && <ChipDS href={url({ equipe: undefined })}>✕ {p.linhas.find((l) => l.id === q.equipe)?.nome || t.semEquipeLbl}</ChipDS>}
      </div>

      <ul>
        {tarefas.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-s2">
            <div className="min-w-0 flex-1">
              <Link href={`/tarefas/${x.id}`} className="block text-sm leading-snug hover:underline">{x.title}</Link>
              <p className="text-xs text-t2">{x.prazo ? <span className={x.prazo < hoje ? "text-err" : ""}>{fmtDate(x.prazo, lang)}</span> : t.semData}{x.responsaveis.length ? ` · ${x.responsaveis.map((r) => p.pessoas.find((y) => y.id === r)?.name.split(" ")[0] ?? r).join(", ")}` : ""}</p>
            </div>
            <form action={atribuirAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={x.id} />
              <select name="pessoa" defaultValue="" aria-label={t.escolherPessoa} className={`${CAMPO_COMPACTO} max-w-36`}>
                <option value="" disabled>{t.escolherPessoa}</option>
                {responsaveisPara(x.equipe).map((g) => (
                  <optgroup key={g.grupo} label={t.gruposResp[g.grupo]}>
                    {g.pessoas.map((y) => <option key={y.id} value={y.id}>{y.name}{y.suspenso ? ` (${t.suspensoLbl})` : ""}</option>)}
                  </optgroup>
                ))}
              </select>
              <BotaoEnviar enviando="…" icone="pessoa" variante="tonal" tamanho="P">{t.atribuirPessoa}</BotaoEnviar>
            </form>
            <PrazoRapido id={x.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} />
          </li>
        ))}
      </ul>
    </div>
  );
}
