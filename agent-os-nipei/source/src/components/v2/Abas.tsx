"use client";

import type { ReactNode } from "react";
import { AbasComPainel } from "@/components/ds/Abas";

/**
 * Compatibilidade: as abas antigas (label / count / alerta) agora são as <Abas> do design system,
 * com a mesma memória da última aba (`inicial` vence a memória, ex.: um link filtrado).
 */
export default function Abas({ id, abas, inicial }: { id: string; inicial?: string; abas: { id: string; label: string; count: number; alerta?: boolean; conteudo: ReactNode }[] }) {
  return <AbasComPainel id={id} inicial={inicial} abas={abas.map((a) => ({ id: a.id, rotulo: a.label, contagem: a.count, alerta: a.alerta, conteudo: a.conteudo }))} />;
}
