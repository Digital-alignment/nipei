"use client";

import { useFormStatus } from "react-dom";
import Botao from "@/components/ds/Botao";
import type { NomeIcone } from "@/components/ds/Icone";

/** Submit button: the design system's <Botao> (arco girando + `enviando`) while its form's action runs. `icone` is required (regra 7). */
export default function BotaoEnviar({ children, enviando, className, name, value, icone, variante = "tonal", tamanho = "M", folha }: {
  children: React.ReactNode; enviando: string; className?: string; name?: string; value?: string;
  icone: NomeIcone; variante?: "primario" | "tonal" | "fantasma"; tamanho?: "G" | "M" | "P"; folha?: boolean;
}) {
  const { pending } = useFormStatus();
  return <Botao type="submit" name={name} value={value} icone={icone} variante={variante} tamanho={tamanho} folha={folha} carregando={pending} textoCarregando={enviando} className={className}>{children}</Botao>;
}
