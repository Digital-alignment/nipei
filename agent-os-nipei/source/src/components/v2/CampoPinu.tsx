"use client";

import { useState, type ReactNode } from "react";
import { BotaoIcone } from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import { MiniAnelPinu, OrbePinu } from "@/components/ds/Pinu";
import { abrirPinu } from "./PedirPinu";

/** The Pinu block at the top of a page (DS 10.5.1 Hoje, 10.6 Agenda). Phone: one Pinu card — orb + field + mic, a thin
 *  rule, the page's shortcuts (`children`) in one row that scrolls sideways. Computer: only the shortcuts row (the header
 *  already has the Pinu's field). Nothing runs on page load: the Pinu only works when the person taps. */
export default function CampoPinu({ l, children }: { l: { placeholder: string; falar: string; enviar: string }; children: ReactNode }) {
  const [texto, setTexto] = useState("");
  const atalhos = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pr-6 [mask-image:linear-gradient(to_right,#000_85%,transparent)] md:pr-1 md:[mask-image:none]">{children}</div>
  );
  return (
    <>
      <Cartao variante="pinu" className="gap-3 p-3 md:hidden">
        <form onSubmit={(e) => { e.preventDefault(); const q = texto.trim(); if (!q) return; abrirPinu({ texto: q }); setTexto(""); }} className="flex items-center gap-2.5">
          <OrbePinu tamanho={28} />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} aria-label={l.placeholder} placeholder={l.placeholder}
            className="min-h-11 min-w-0 flex-1 bg-transparent font-texto text-[15px] text-t1 outline-none placeholder:text-t2" />
          {texto.trim()
            ? <BotaoIcone type="submit" icone="enviar" aria-label={l.enviar} tamanho={44} variante="acento" />
            : <BotaoIcone icone="microfone" aria-label={l.falar} tamanho={44} variante="acento" onClick={() => abrirPinu({ voz: true })} />}
        </form>
        <hr className="h-px border-0 bg-current opacity-10" />
        {atalhos}
      </Cartao>
      <div className="hidden items-center gap-2 md:flex">
        <MiniAnelPinu tamanho={22} />
        {atalhos}
      </div>
    </>
  );
}
