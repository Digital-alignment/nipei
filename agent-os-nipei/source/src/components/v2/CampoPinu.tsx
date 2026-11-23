"use client";

import { useState } from "react";
import { BotaoIcone } from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import { MiniAnelPinu, OrbePinu } from "@/components/ds/Pinu";
import PedirPinu, { abrirPinu } from "./PedirPinu";
import GerarResumo from "./GerarResumo";

type L = { placeholder: string; falar: string; enviar: string; anotar: string; anotePrefixo: string; planejar: string; planejarAmanha: string; resumo: string; resumindo: string };

/** The Pinu at the centre of Hoje (DS 10.5.1). Phone: one Pinu card — orb + field + mic, a thin rule, the shortcuts in one
 *  row that scrolls sideways. Computer: only the shortcuts row (the header already has the Pinu's field). Nothing runs on
 *  page load: the Pinu only works when the person taps. */
/** noite (17 h on, or the day is closed): "Planejar meu dia" becomes "Planejar amanhã" (phase 3). */
export default function CampoPinuHoje({ l, noite }: { l: L; noite: boolean }) {
  const [texto, setTexto] = useState("");
  const atalhos = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pr-6 [mask-image:linear-gradient(to_right,#000_85%,transparent)] md:pr-1 md:[mask-image:none]">
      <PedirPinu rotulo={l.anotar} icone="editar" preencher={l.anotePrefixo} />
      {noite ? <PedirPinu rotulo={l.planejarAmanha} icone="tarefa" atalho="amanha" /> : <PedirPinu rotulo={l.planejar} icone="tarefa" atalho="planejar" />}
      <GerarResumo rotulo={l.resumo} gerando={l.resumindo} />
    </div>
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
