"use client";

import { useState } from "react";
import Icone from "@/components/ds/Icone";

export default function CopiarBotao({ texto, label, copiado, className }: { texto: string; label: string; copiado: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(texto).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      className={className ?? "anel-foco inline-flex h-12 items-center gap-2 rounded-pilula bg-s3 px-5 font-texto text-[15px] font-semibold text-t1 hover:bg-s4"}>
      {/* TODO(ícones): ícone `copiar` (pedido em ICONES.md); provisório: baixar */}{ok ? <Icone nome="confirmar" tamanho={18} /> : <Icone nome="baixar" tamanho={18} />}{ok ? copiado : label}
    </button>
  );
}
