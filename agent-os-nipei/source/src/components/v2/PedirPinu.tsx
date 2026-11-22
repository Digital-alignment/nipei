"use client";

import Chip from "@/components/ds/Chip";
import { ABRIR_ASSISTENTE } from "./AssistenteGlobal";

/** Detail of the "nipei:assistente" event: send a message, pick a shortcut, pre-fill the field or open listening. */
export type PedidoPinu = { texto?: string; atalho?: string; preencher?: string; voz?: boolean };
export const abrirPinu = (d: PedidoPinu) => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail: d }));

/** A Pinu chip (mini-ring) that opens the panel with a request (DS 10.5.1: shortcuts in Hoje, "Resolver com o Pinu"). */
export default function PedirPinu({ rotulo, ...pedido }: { rotulo: string } & PedidoPinu) {
  return <Chip tipo="pinu" onClick={() => abrirPinu(pedido)}>{rotulo}</Chip>;
}
