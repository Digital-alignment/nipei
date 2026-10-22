import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, Title } from "@/components/v2/ui";
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
  const sel = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs max-w-36";

  return (
    <div className="max-w-3xl mx-auto">
      <Title sub={t.pulsoIntro}>{t.pulso}</Title>

      <table className="w-full text-sm mb-6">
        <thead><tr className="text-xs text-neutral-500 text-left"><th className="font-normal py-1"></th><th className="font-normal text-right">{t.tarefasAbertasLbl}</th><th className="font-normal text-right">{t.atrasadasLbl}</th><th className="font-normal text-right">{t.semDonoLbl}</th></tr></thead>
        <tbody>
          {p.linhas.map((l) => (
            <tr key={l.id || "sem"} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="py-1.5"><Link href={url({ equipe: l.id })} className="inline-flex items-center gap-1.5 hover:underline"><span className="w-2 h-2 rounded-full" style={{ background: l.cor }} />{l.nome || t.semEquipeLbl}</Link></td>
              <td className="text-right tabular-nums">{l.abertas}</td>
              <td className={`text-right tabular-nums ${l.atrasadas ? "text-red-600 dark:text-red-400" : ""}`}><Link href={url({ equipe: l.id, ver: "atrasadas" })}>{l.atrasadas}</Link></td>
              <td className={`text-right tabular-nums ${l.semDono ? "text-amber-700 dark:text-amber-400" : ""}`}><Link href={url({ equipe: l.id, ver: "semdono" })}>{l.semDono}</Link></td>
            </tr>
          ))}
          <tr className="border-t border-neutral-300 dark:border-neutral-700 font-medium"><td className="py-1.5">Total</td><td className="text-right tabular-nums">{p.abertas}</td><td className="text-right tabular-nums">{p.atrasadas}</td><td className="text-right tabular-nums">{p.semDono}</td></tr>
        </tbody>
      </table>

      <div className="flex flex-wrap gap-2 mb-3">
        <Chip href={url({ ver: "semdono" })} on={ver === "semdono"}>{t.semDonoLbl} ({p.semDono})</Chip>
        <Chip href={url({ ver: "atrasadas" })} on={ver === "atrasadas"}>{t.atrasadasLbl} ({p.atrasadas})</Chip>
        {q.equipe !== undefined && <Chip href={url({ equipe: undefined })}>✕ {p.linhas.find((l) => l.id === q.equipe)?.nome || t.semEquipeLbl}</Chip>}
      </div>

      <ul>
        {tarefas.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="min-w-0 flex-1">
              <Link href={`/tarefas/${x.id}`} className="block text-sm leading-snug hover:underline">{x.title}</Link>
              <p className="text-xs text-neutral-500">{x.prazo ? <span className={x.prazo < hoje ? "text-red-600 dark:text-red-400" : ""}>{fmtDate(x.prazo, lang)}</span> : t.semData}{x.responsaveis.length ? ` · ${x.responsaveis.map((r) => p.pessoas.find((y) => y.id === r)?.name.split(" ")[0] ?? r).join(", ")}` : ""}</p>
            </div>
            <form action={atribuirAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={x.id} />
              <select name="pessoa" defaultValue="" aria-label={t.escolherPessoa} className={sel}>
                <option value="" disabled>{t.escolherPessoa}</option>
                {responsaveisPara(x.equipe).map((g) => (
                  <optgroup key={g.grupo} label={t.gruposResp[g.grupo]}>
                    {g.pessoas.map((y) => <option key={y.id} value={y.id}>{y.name}{y.suspenso ? ` (${t.suspensoLbl})` : ""}</option>)}
                  </optgroup>
                ))}
              </select>
              <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs">{t.atribuirPessoa}</BotaoEnviar>
            </form>
            <PrazoRapido id={x.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} />
          </li>
        ))}
      </ul>
    </div>
  );
}
