"use client";

import { BotaoIcone } from "@/components/ds/Botao";
import { abrirPinu } from "./PedirPinu";

/** Microphone of Hoje's quick field (DS 10.5.1): opens the Pinu listening; what is said goes as quick capture. */
export default function DitarPinu({ rotulo, prefixo }: { rotulo: string; prefixo: string }) {
  return <BotaoIcone icone="microfone" aria-label={rotulo} tamanho={44} variante="fantasma" onClick={() => abrirPinu({ voz: true, prefixo })} />;
}
