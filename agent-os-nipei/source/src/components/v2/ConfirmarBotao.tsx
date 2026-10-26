"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useConfirmar } from "@/components/ds/Dialogo";

/**
 * Botão de formulário que pergunta antes (remover de uma equipe, desconectar…). A pergunta abre o
 * <Dialogo> do design system (nada de confirm() do navegador); só com "sim" o formulário é enviado.
 * `perigoso` (padrão) = o botão de confirmar do diálogo é o vermelho "Remover"; o rótulo dele é o próprio
 * texto do botão, a não ser que `confirmarRotulo` diga outro.
 */
export default function ConfirmarBotao({ children, pergunta, mensagem, confirmarRotulo, perigoso = true, className }: {
  children: ReactNode; pergunta: string; mensagem?: ReactNode; confirmarRotulo?: string; perigoso?: boolean; className?: string;
}) {
  const { pending } = useFormStatus();
  const confirmar = useConfirmar();
  return (
    <button type="button" disabled={pending} className={`${className ?? ""} disabled:opacity-50`}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        const ok = await confirmar({ titulo: pergunta, mensagem, perigoso, confirmarRotulo: confirmarRotulo ?? (typeof children === "string" ? children : "Confirmar") });
        if (ok) form?.requestSubmit();
      }}>
      {pending ? "…" : children}
    </button>
  );
}
