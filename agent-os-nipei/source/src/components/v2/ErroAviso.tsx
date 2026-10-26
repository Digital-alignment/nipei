"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Aviso from "@/components/ds/Aviso";

/** Shows the ?erro= message an action sent back (e.g. the AI failed) as a design-system <Aviso>, with ✕ to dismiss it. */
export default function ErroAviso() {
  const params = useSearchParams();
  const erro = params.get("erro");
  const [fechado, setFechado] = useState<string | null>(null);
  if (!erro || fechado === erro) return null;
  const fechar = () => {
    setFechado(erro);
    // tira ?erro= da URL sem recarregar (recarregar não mostra o aviso de novo)
    const p = new URLSearchParams(params.toString());
    p.delete("erro");
    window.history.replaceState(null, "", `${window.location.pathname}${p.size ? `?${p}` : ""}${window.location.hash}`);
  };
  return <Aviso estado="erro" titulo="Não deu certo" mensagem={erro} onFechar={fechar} className="mb-5" />;
}
