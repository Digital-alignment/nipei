import Chip from "@/components/ds/Chip";
import { EstadoVazio } from "@/components/ds/Estados";
import Campo from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";
import { chaveEquipe } from "@/components/ds/equipes";
import { FiltroAuto } from "@/components/v2/AcervoForm";
import { filtrarConfirmados, TIPOS_FATO, usoFatos } from "@/lib/v2/conhecimento";
import type { Ctx } from "./index";

const MAX = 60;

/**
 * The confirmed facts — the only knowledge the AIs treat as true. Search by words (any order, accents ignored)
 * + team chips + type / project / person (only the ones that appear in confirmed facts). All in the URL.
 */
export default function Base({ ctx }: { ctx: Ctx }) {
  const { q, t, equipes, confirmados } = ctx;
  const acervoDe = new Map(ctx.fontes.filter((f) => f.acervo).map((f) => [f.id, f.acervo]));
  const lista = filtrarConfirmados(q);
  const uso = usoFatos();
  const projetos = ctx.projetos.filter((p) => confirmados.some((f) => f.projetos.includes(p.id)));
  const pessoas = [...new Set(confirmados.flatMap((f) => f.pessoas))].map((id) => ({ id, nome: ctx.nome(id) })).sort((a, b) => a.nome.localeCompare(b.nome));
  const url = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ q: q.q, tipo: q.tipo, projeto: q.projeto, pessoa: q.pessoa, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/conhecimento${s ? `?${s}` : ""}#base`;
  };
  return (
    <div className="grid gap-3">
      <FiltroAuto className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        <div className="col-span-2 md:col-span-1"><Campo tipo="busca" name="q" rotulo={t.buscar} defaultValue={q.q} /></div>
        <Campo tipo="selecao" name="tipo" rotulo={t.tipo} defaultValue={q.tipo ?? ""}>
          <option value="">{t.todosTipos}</option>{TIPOS_FATO.map((x) => <option key={x} value={x}>{t.tiposFato[x] ?? x}</option>)}
        </Campo>
        <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue={q.projeto ?? ""}>
          <option value="">{t.todosProjetos}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Campo>
        <div className="col-span-2 md:col-span-1"><Campo tipo="selecao" name="pessoa" rotulo={t.pessoaLbl} defaultValue={q.pessoa ?? ""}>
          <option value="">{t.todasPessoas}</option>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Campo></div>
      </FiltroAuto>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip href={url({ equipe: undefined })} ativo={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} tipo={chaveEquipe(e.id) ? "equipe" : "filtro"} equipe={e.id} ativo={q.equipe === e.id} href={url({ equipe: e.id })}>{e.nome}</Chip>)}
      </div>
      {lista.length ? (
        <>
          <ul className="overflow-hidden rounded-cartao bg-s1">
            {lista.slice(0, MAX).map((f) => (
              <li key={f.id} className="flex items-start gap-2 border-t border-s2 py-2.5 pl-4 pr-1.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="rotulo-maiusculo text-t3">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</p>
                  <p className="corpo text-t1">{f.texto}</p>
                  {!!uso[f.id]?.n && <p className="meta text-t3">{t.usadoIA}: {uso[f.id].n} {uso[f.id].n === 1 ? t.vez : t.vezes}</p>}
                </div>
                <BotaoIcone icone="avancar" aria-label={t.verFato} tamanho={40} variante="fantasma" href={`/conhecimento/fato/${f.id}`} />
                {acervoDe.has(f.fonte) && <BotaoIcone icone="abrir-fora" aria-label={t.noAcervo} tamanho={40} variante="fantasma" href={`/acervo#${acervoDe.get(f.fonte)}`} />}
              </li>
            ))}
          </ul>
          {lista.length > MAX && <p className="meta text-t2">{t.mostrando} {MAX} / {lista.length} — {t.refineBusca}</p>}
        </>
      ) : <EstadoVazio compacto titulo={<>{t.semItens}</>} />}
    </div>
  );
}
