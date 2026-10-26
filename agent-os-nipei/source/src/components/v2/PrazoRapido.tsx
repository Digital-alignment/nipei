"use client";

import { useState, useTransition } from "react";
import { prazoRapidoAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";
import { BotaoIcone } from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";

/** New due date in two taps: the calendar icon opens the options (keeps the list compact). */
export default function PrazoRapido({ id, opcoes, outraData, rotulo }: { id: string; opcoes: { label: string; data: string }[]; outraData: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const salvar = (prazo: string) => {
    if (!prazo || pending) return;
    if (offline()) { enfileirar({ tipo: "prazo", id, valor: prazo }); setAberto(false); return; }
    const f = new FormData();
    f.set("id", id);
    f.set("prazo", prazo);
    start(async () => { await prazoRapidoAction(f); setAberto(false); });
  };
  return (
    <>
      <BotaoIcone icone="calendario" aria-label={rotulo} tamanho={40} variante="fantasma" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
        className={aberto ? "bg-s3" : "text-t2"} />
      {aberto && (
        <div className={`order-last basis-full flex flex-wrap items-center gap-2 pb-2.5 pl-12 ${pending ? "opacity-50" : ""}`}>
          {opcoes.map((o) => <Chip key={o.label} icone="prazo" onClick={() => salvar(o.data)}>{o.label}</Chip>)}
          <label className="anel-foco relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 hover:bg-s3 hover:text-t1">
            <Icone nome="calendario" tamanho={16} />{outraData}
            <input type="date" disabled={pending} onChange={(e) => salvar(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={outraData} />
          </label>
        </div>
      )}
    </>
  );
}
