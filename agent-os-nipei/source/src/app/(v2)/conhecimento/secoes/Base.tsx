import { Empty } from "@/components/v2/ui";
import Chip from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";
import { chaveEquipe } from "@/components/ds/equipes";
import type { Ctx } from "./index";

const MAX = 60;

/** The confirmed facts — the only knowledge the AIs treat as true. Search + team filter (?q ?equipe). */
export default function Base({ ctx }: { ctx: Ctx }) {
  const { q, t, equipes, confirmados } = ctx;
  const acervoDe = new Map(ctx.fontes.filter((f) => f.acervo).map((f) => [f.id, f.acervo]));
  const busca = (q.q ?? "").toLowerCase().trim();
  const lista = confirmados.filter((f) => (!q.equipe || f.equipe === q.equipe) && (!busca || f.texto.toLowerCase().includes(busca)))
    .sort((a, b) => b.revisadoEm.localeCompare(a.revisadoEm));
  const url = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
    return `/conhecimento${s ? `?${s}` : ""}#base`;
  };
  return (
    <div className="grid gap-3">
      <form action="/conhecimento#base">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        <Campo tipo="busca" name="q" rotulo={t.buscar} defaultValue={q.q} />
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip href={url({ q: q.q })} ativo={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} tipo={chaveEquipe(e.id) ? "equipe" : "filtro"} equipe={e.id} ativo={q.equipe === e.id} href={url({ q: q.q, equipe: e.id })}>{e.nome}</Chip>)}
      </div>
      {lista.length ? (
        <>
          <ul className="overflow-hidden rounded-cartao bg-s1">
            {lista.slice(0, MAX).map((f) => (
              <li key={f.id} className="flex items-start gap-2 border-t border-s2 py-2.5 pl-4 pr-1.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="rotulo-maiusculo text-t3">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</p>
                  <p className="corpo text-t1">{f.texto}</p>
                </div>
                <BotaoIcone icone="avancar" aria-label={t.verOriginal} tamanho={40} variante="fantasma" href={`/conhecimento/${f.fonte}`} />
                {acervoDe.has(f.fonte) && <BotaoIcone icone="abrir-fora" aria-label={t.noAcervo} tamanho={40} variante="fantasma" href={`/acervo#${acervoDe.get(f.fonte)}`} />}
              </li>
            ))}
          </ul>
          {lista.length > MAX && <p className="meta text-t2">{t.mostrando} {MAX} / {lista.length} — {t.refineBusca}</p>}
        </>
      ) : <Empty>{t.semItens}</Empty>}
    </div>
  );
}
