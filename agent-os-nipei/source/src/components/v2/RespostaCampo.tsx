"use client";

import { useState } from "react";

/** Answer box with a live word count that asks for depth below `minimo` words. */
export default function RespostaCampo({ name, inicial, minimo, labels }: {
  name: string; inicial: string; minimo: number; labels: { palavras: string; curta: string };
}) {
  const [texto, setTexto] = useState(inicial);
  const n = texto.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="grid gap-1">
      <textarea name={name} value={texto} onChange={(e) => setTexto(e.target.value)} rows={Math.min(14, Math.max(4, Math.ceil(texto.length / 70)))}
        maxLength={8000} className="w-full rounded-interno bg-s2 px-3 py-2 text-sm" />
      <p className={`text-xs ${n > 0 && n < minimo ? "text-warn" : "text-t3"}`}>
        {n} {labels.palavras}{n > 0 && n < minimo ? ` · ${labels.curta}` : ""}
      </p>
    </div>
  );
}
