"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopiarBotao({ texto, label, copiado, className }: { texto: string; label: string; copiado: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(texto).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      className={className ?? "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"}>
      {ok ? <Check size={14} /> : <Copy size={14} />}{ok ? copiado : label}
    </button>
  );
}
