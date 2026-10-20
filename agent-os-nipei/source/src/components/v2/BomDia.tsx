"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { bomDiaAction } from "@/app/(v2)/actions";

/** The day's AI summary: shown at once when cached, otherwise fetched after the page is on screen. */
export default function BomDia({ inicial }: { inicial: string | null }) {
  const [texto, setTexto] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (inicial !== null) return;
    let vivo = true;
    bomDiaAction().then((t) => { if (vivo) setTexto(t || ""); }).catch(() => vivo && setTexto(""));
    return () => { vivo = false; };
  }, [inicial]);
  if (texto === "") return null; // AI unavailable or nothing to say: the page works without it
  return (
    <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}
      className="mb-3 flex w-full items-start gap-2 text-left text-sm text-neutral-600 dark:text-neutral-300">
      <Sparkles size={14} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
      {texto === null
        ? <span className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        : <span className={aberto ? "" : "line-clamp-2"}>{texto}</span>}
    </button>
  );
}
