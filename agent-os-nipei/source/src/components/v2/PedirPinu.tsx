"use client";

import Chip from "@/components/ds/Chip";
import type { NomeIcone } from "@/components/ds/Icone";
import { ABRIR_ASSISTENTE } from "./AssistenteGlobal";

/** Detail of the "nipei:assistente" event: send a message, pick a shortcut, pre-fill the field or open listening. */
export type PedidoPinu = { texto?: string; atalho?: string; preencher?: string; voz?: boolean; prefixo?: string };
export const abrirPinu = (d: PedidoPinu) => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail: d }));

/** A chip that opens the Pinu with a request (DS 10.5.1). With `icone`: a neutral chip with that icon (Hoje's shortcuts,
 *  inside the Pinu card); without: the Pinu chip with the mini-ring ("Resolver com o Pinu"). */
export default function PedirPinu({ rotulo, icone, ...pedido }: { rotulo: string; icone?: NomeIcone } & PedidoPinu) {
  return icone
    ? <Chip icone={icone} onClick={() => abrirPinu(pedido)}>{rotulo}</Chip>
    : <Chip tipo="pinu" onClick={() => abrirPinu(pedido)}>{rotulo}</Chip>;
}
