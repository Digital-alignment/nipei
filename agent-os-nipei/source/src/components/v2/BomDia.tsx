"use client";

import { useEffect, useState } from "react";
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
      className="mb-3 block w-full text-left text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
      {texto === null
        ? <span className="block h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        : <span className={aberto ? "" : "line-clamp-2"}>{texto}</span>}
    </button>
  );
}
