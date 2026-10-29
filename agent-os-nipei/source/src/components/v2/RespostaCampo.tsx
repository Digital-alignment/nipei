"use client";

import { useState } from "react";
import Campo from "@/components/ds/Campo";

/** Answer box with a live word count that asks for depth below `minimo` words. */
export default function RespostaCampo({ name, inicial, minimo, labels }: {
  name: string; inicial: string; minimo: number; labels: { rotulo: string; palavras: string; curta: string };
}) {
  const [texto, setTexto] = useState(inicial);
  const n = texto.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="grid gap-1">
      <Campo tipo="area" rotulo={labels.rotulo} name={name} value={texto} onChange={(e) => setTexto(e.target.value)} rows={Math.min(14, Math.max(4, Math.ceil(texto.length / 70)))} maxLength={8000} />
      <p className={`text-xs ${n > 0 && n < minimo ? "text-warn" : "text-t3"}`}>
        {n} {labels.palavras}{n > 0 && n < minimo ? ` · ${labels.curta}` : ""}
      </p>
    </div>
  );
}
