import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import BotaoEnviar from "./BotaoEnviar";
import { addToEquipeAction, notaInternaAction } from "@/app/(v2)/actions";
import type { Dict } from "@/lib/v2/i18n";

type Equipe = { id: string; nome: string; cor: string; gestao: boolean };

/**
 * "Escolher equipe" for one person: tick one or more teams and add them in one go, plus the quick
 * action "Nota interna" (management only) that saves a private note on the person's profile.
 * Plain forms (no client state), so it works in lists of many people.
 */
export default function EscolherEquipes({ pessoaId, equipes, t, notas = 0, comNota = true }: {
  pessoaId: string; equipes: Equipe[]; t: Dict; notas?: number; comNota?: boolean;
}) {
  return (
    <div className="grid gap-2 w-full sm:w-auto">
      {equipes.length > 0 && (
        <form action={addToEquipeAction} aria-label={t.marqueEquipes} title={t.marqueEquipes} className="flex flex-wrap items-center gap-1.5">
          <input type="hidden" name="pessoa" value={pessoaId} />
          {equipes.map((e) => (
            // chip de equipe (seção 9.6) que marca: selo + nome; marcado = s3 + anel na cor da equipe + ✓
            <label key={e.id} title={e.gestao ? t.gestaoCompleta : undefined}
              className="anel-foco alvo-toque group/eq inline-flex h-9 cursor-pointer select-none items-center gap-2 rounded-pilula bg-s2 pl-2.5 pr-3.5 font-texto text-sm font-medium text-t2 hover:bg-s3 hover:text-t1 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--cor-eq)] has-[:focus-visible]:shadow-foco"
              style={{ "--cor-eq": EQUIPES_DS[chaveEquipe(e.id) ?? chaveEquipe(e.cor) ?? "escritorio"].cor } as React.CSSProperties}>
              <input type="checkbox" name="equipe" value={e.id} className="sr-only" />
              {chaveEquipe(e.id) ?? chaveEquipe(e.cor)
                ? <Selo nome={EQUIPES_DS[(chaveEquipe(e.id) ?? chaveEquipe(e.cor))!].selo} tamanho={18} style={{ color: "var(--cor-eq)" }} />
                : <Icone nome="pessoas" tamanho={16} />}
              {e.nome}{e.gestao ? " *" : ""}
              <Icone nome="confirmar" tamanho={14} className="hidden text-ac-text group-has-[:checked]/eq:inline" />
            </label>
          ))}
          <BotaoEnviar enviando="…" icone="mais" variante="tonal" tamanho="P">{t.adicionar}</BotaoEnviar>
        </form>
      )}
      {comNota && (
        <details className="group">
          <summary className="anel-foco alvo-toque meta inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-pilula text-t2 hover:text-t1">
            <Icone nome="editar" tamanho={16} />{t.notaInterna}{notas > 0 && <span className="rounded-pilula bg-s3 px-1.5 tabular-nums">{notas}</span>}
          </summary>
          <form action={notaInternaAction} className="grid gap-1.5 mt-2">
            <input type="hidden" name="pessoa" value={pessoaId} /><input type="hidden" name="modo" value="nova" />
            <textarea name="texto" required rows={2} maxLength={4000} placeholder={t.notaPlaceholder}
              className="w-full sm:w-80 rounded-interno bg-s2 px-3 py-2 font-texto text-sm text-t1 outline-none placeholder:text-t3 focus:shadow-foco" />
            <div className="flex items-center gap-2">
              <BotaoEnviar enviando="…" icone="confirmar" variante="tonal" tamanho="P">{t.salvarNota}</BotaoEnviar>
              <span className="meta text-t3"><Icone nome="cadeado" tamanho={14} className="mr-1 inline align-[-2px]" />{t.soEquipe1}</span>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
