"use client";

import { useFormStatus } from "react-dom";
import Botao from "@/components/ds/Botao";
import type { NomeIcone } from "@/components/ds/Icone";

/**
 * Submit button that disables itself and shows `enviando` while its form's action runs.
 * With `icone` it is the design system's <Botao> (arco girando + texto); `className` alone keeps a custom look.
 */
export default function BotaoEnviar({ children, enviando, className, name, value, icone, variante = "tonal", tamanho = "M", folha }: {
  children: React.ReactNode; enviando: string; className?: string; name?: string; value?: string;
  icone?: NomeIcone; variante?: "primario" | "tonal" | "fantasma"; tamanho?: "G" | "M" | "P"; folha?: boolean;
}) {
  const { pending } = useFormStatus();
  if (icone) return <Botao type="submit" name={name} value={value} icone={icone} variante={variante} tamanho={tamanho} folha={folha} carregando={pending} textoCarregando={enviando} className={className}>{children}</Botao>;
  return <button name={name} value={value} disabled={pending} className={`${className ?? ""} disabled:opacity-60`}>{pending ? enviando : children}</button>;
}
