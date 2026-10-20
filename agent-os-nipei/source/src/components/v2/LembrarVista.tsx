"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Remembers the chosen params (e.g. Agenda's vista/quem) on this device and reopens with them. */
export default function LembrarVista({ chave, params }: { chave: string; params: string[] }) {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  useEffect(() => {
    const k = `nipei:vista:${chave}`;
    const atuais = Object.fromEntries(params.map((p) => [p, sp.get(p)]).filter(([, v]) => v));
    try {
      if (Object.keys(atuais).length) return localStorage.setItem(k, JSON.stringify(atuais));
      if ([...sp.keys()].length) return; // other params (a day, a week): keep the URL as it is
      const salvo = JSON.parse(localStorage.getItem(k) ?? "null") as Record<string, string> | null;
      if (salvo && Object.keys(salvo).length) router.replace(`${path}?${new URLSearchParams(salvo)}`);
    } catch { /* storage blocked */ }
  }, [chave, params, sp, router, path]);
  return null;
}
