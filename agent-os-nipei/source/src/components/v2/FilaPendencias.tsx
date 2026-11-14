"use client";

import { useState, type ReactNode } from "react";
import Chip from "@/components/ds/Chip";

// Pendências de Hoje (DS 10.5.1): a group label + chips that wrap. On phones only the first `limite` show, plus a
// "+N" chip that opens the rest in place (before, the row scrolled sideways and what passed the edge was never seen).
export default function FilaPendencias({ rotulo, itens, limite = 3 }: { rotulo: string; itens: ReactNode[]; limite?: number }) {
  const [tudo, setTudo] = useState(false);
  const resto = itens.length - limite;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rotulo-maiusculo w-full text-t3 sm:w-auto">{rotulo}</span>
      {itens.map((x, i) => <span key={i} className={i >= limite && !tudo ? "hidden sm:contents" : "contents"}>{x}</span>)}
      {resto > 0 && !tudo && <span className="sm:hidden"><Chip onClick={() => setTudo(true)}>+{resto}</Chip></span>}
    </div>
  );
}
