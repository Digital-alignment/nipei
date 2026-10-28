"use client";

import { useState, useTransition } from "react";
import Botao from "@/components/ds/Botao";
import Aviso from "@/components/ds/Aviso";
import { MiniAnelPinu } from "@/components/ds/Pinu";
import { resumirConhecimentoAction } from "@/app/(v2)/actions";

/** "Resumir com o Pinu": answer from the facts already listed (cited as [n], same numbers as the list). */
export default function ResumirPinu({ pergunta, ids, rotulos }: { pergunta: string; ids: string[]; rotulos: { resumir: string; resumindo: string; resposta: string } }) {
  const [r, setR] = useState<{ texto?: string; erro?: string } | null>(null);
  const [pending, start] = useTransition();
  if (r?.texto) {
    return (
      <div className="grid gap-2 rounded-cartao bg-ac-soft p-4 brilho-ia" aria-live="polite">
        <span className="inline-flex items-center gap-2 rotulo-maiusculo text-ac-text"><MiniAnelPinu tamanho={18} />{rotulos.resposta}</span>
        <p className="corpo whitespace-pre-wrap text-t1">{r.texto}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <Botao icone="mensagem" variante="tonal" tamanho="M" className="justify-self-start" carregando={pending} textoCarregando={rotulos.resumindo}
        onClick={() => start(async () => setR(await resumirConhecimentoAction(pergunta, ids)))}>{rotulos.resumir}</Botao>
      {r?.erro && <Aviso estado="erro" titulo={r.erro} />}
    </div>
  );
}
