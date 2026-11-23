"use client";

import { useState, useTransition } from "react";
import Botao from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import { resumoDiaAction } from "@/app/(v2)/actions";

/** "Resumo do dia" (DS 10.5.1, phase 3): the Pinu writes today's summary into Hoje. As a chip (the shortcut) or as the
 *  "Atualizar" button of the summary block. The page refreshes itself when the action revalidates /hoje. */
export default function GerarResumo({ rotulo, gerando, comoBotao }: { rotulo: string; gerando: string; comoBotao?: boolean }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState("");
  const gerar = () => start(async () => { setErro(""); const r = await resumoDiaAction().catch(() => ({ error: "Falha de conexão" })); if ("error" in r && r.error) setErro(r.error); });
  return (
    <>
      {comoBotao
        ? <Botao type="button" variante="fantasma" tamanho="P" icone="gerar-outra" carregando={pending} textoCarregando={gerando} onClick={gerar}>{rotulo}</Botao>
        : <Chip icone="calendario" onClick={pending ? undefined : gerar}>{pending ? gerando : rotulo}</Chip>}
      {erro && <span role="alert" className="meta text-err">{erro}</span>}
    </>
  );
}
