import Botao, { BotaoIcone } from "@/components/ds/Botao";
import { EstadoVazio } from "@/components/ds/Estados";
import type { Fato } from "@/lib/v2/conhecimento";
import type { Dict } from "@/lib/v2/i18n";

const MAX = 10;

/**
 * "O que sabemos": the confirmed facts linked to a project / team / person (newest review first),
 * each one opening its page (text, source, history, AI use); "Ver na base" opens Conhecimento already filtered.
 */
export default function OQueSabemos({ fatos, t, base }: { fatos: Fato[]; t: Dict; base: string }) {
  if (!fatos.length) return <EstadoVazio compacto selo="espiral" titulo={<>{t.oQueSabemosVazio}</>} />;
  return (
    <div className="grid gap-3">
      <ul className="overflow-hidden rounded-cartao bg-s1">
        {fatos.slice(0, MAX).map((f) => (
          <li key={f.id} className="flex items-start gap-2 border-t border-s2 py-2.5 pl-4 pr-1.5 first:border-t-0">
            <div className="min-w-0 flex-1">
              <p className="rotulo-maiusculo text-t3">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</p>
              <p className="corpo text-t1">{f.texto}</p>
            </div>
            <BotaoIcone icone="avancar" aria-label={t.verFato} tamanho={40} variante="fantasma" href={`/conhecimento/fato/${f.id}`} />
          </li>
        ))}
      </ul>
      <Botao href={base} icone="buscar" variante="fantasma" tamanho="M" className="justify-self-start">{`${t.verNaBase}${fatos.length > MAX ? ` (${fatos.length})` : ""}`}</Botao>
    </div>
  );
}
