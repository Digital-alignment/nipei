import type { ReactNode } from "react";
import Selo, { type NomeSelo } from "./Selo";

/**
 * Cabeçalho de página (DESIGN-SYSTEM.md seção 10.1): rótulo pequeno com selo · título `titulo-pagina` ·
 * subtítulo com contagens · à direita as ações (busca + ação principal em folha) · embaixo abas e chips de filtro
 * (os chips rolam na horizontal no celular).
 */
export default function CabecalhoPagina({ rotulo, selo, titulo, subtitulo, acoes, abas, filtros }: {
  rotulo?: ReactNode; selo?: NomeSelo; titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode; abas?: ReactNode; filtros?: ReactNode;
}) {
  return (
    <header className="mb-6 grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          {(rotulo || selo) && <p className="rotulo-maiusculo flex items-center gap-2 text-t2">{selo && <Selo nome={selo} tamanho={18} />}{rotulo}</p>}
          <h1 className="titulo-pagina text-t1">{titulo}</h1>
          {subtitulo && <div className="corpo text-t2">{subtitulo}</div>}
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>
      {abas}
      {filtros && <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">{filtros}</div>}
    </header>
  );
}
