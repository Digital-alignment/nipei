"use client";

import { useState } from "react";
import { BotaoIcone } from "@/components/ds/Botao";
import { MiniAnelPinu } from "@/components/ds/Pinu";
import PedirPinu, { abrirPinu } from "./PedirPinu";

/** The Pinu at the centre of Hoje (DS 10.5.1): the field only on phones (the computer header already has the Pinu's field),
 *  the shortcuts everywhere. Ask anything (opens the panel with the message sent), speak, or tap a
 *  shortcut. Nothing runs on page load: the Pinu only works when the person taps. */
export default function CampoPinuHoje({ l }: { l: { placeholder: string; falar: string; enviar: string; anotar: string; anotePrefixo: string; planejar: string; meuDia: string } }) {
  const [texto, setTexto] = useState("");
  return (
    <div className="grid gap-2">
      <form onSubmit={(e) => { e.preventDefault(); const q = texto.trim(); if (!q) return; abrirPinu({ texto: q }); setTexto(""); }}
        className="flex min-h-14 items-center gap-2 rounded-pilula md:hidden bg-s2 py-1.5 pl-4 pr-1.5 shadow-brilho-ia transition-shadow focus-within:shadow-foco">
        <MiniAnelPinu tamanho={22} />
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} aria-label={l.placeholder} placeholder={l.placeholder}
          className="min-w-0 flex-1 bg-transparent font-texto text-[15px] text-t1 outline-none placeholder:text-t3" />
        {texto.trim()
          ? <BotaoIcone type="submit" icone="enviar" aria-label={l.enviar} tamanho={44} variante="acento" />
          : <BotaoIcone icone="microfone" aria-label={l.falar} tamanho={44} variante="acento" onClick={() => abrirPinu({ voz: true })} />}
      </form>
      <div className="flex flex-wrap gap-2">
        <PedirPinu rotulo={l.anotar} preencher={l.anotePrefixo} />
        <PedirPinu rotulo={l.planejar} atalho="planejar" />
        <PedirPinu rotulo={l.meuDia} atalho="dia" />
      </div>
    </div>
  );
}
