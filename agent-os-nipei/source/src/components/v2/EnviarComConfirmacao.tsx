"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Botao from "@/components/ds/Botao";
import { useConfirmar } from "@/components/ds/Dialogo";
import type { NomeIcone } from "@/components/ds/Icone";

/** Botão do sistema que pergunta no <Dialogo> antes de enviar o formulário (ações que saem do Nipëi, como WhatsApp). */
export default function EnviarComConfirmacao({ children, icone, pergunta, mensagem, confirmarRotulo, textoCarregando = "Enviando…", perigoso = false, variante }: {
  children: ReactNode; icone: NomeIcone; pergunta: string; mensagem?: ReactNode; confirmarRotulo: string; textoCarregando?: string;
  perigoso?: boolean; variante?: "primario" | "tonal" | "fantasma";
}) {
  const { pending } = useFormStatus();
  const confirmar = useConfirmar();
  return (
    <Botao type="button" icone={icone} tamanho="M" variante={variante} carregando={pending} textoCarregando={textoCarregando}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        if (await confirmar({ titulo: pergunta, mensagem, perigoso, confirmarRotulo })) form?.requestSubmit();
      }}>
      {children}
    </Botao>
  );
}
