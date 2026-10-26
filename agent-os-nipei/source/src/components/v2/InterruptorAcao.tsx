"use client";

import { useRef, useState } from "react";
import { LinhaConfiguracao } from "@/components/ds/Controles";

/**
 * Linha de configuração (seção 9.15) cujo interruptor envia uma server action: o formulário escondido leva
 * os `campos` e o estado novo vai em `valorLigado` / `valorDesligado` no campo `nome`.
 */
export default function InterruptorAcao({ acao, campos, nome = "o", valorLigado, valorDesligado, ligado, rotulo, descricao }: {
  acao: (f: FormData) => void | Promise<void>; campos?: Record<string, string>; nome?: string;
  valorLigado: string; valorDesligado: string; ligado: boolean; rotulo: string; descricao?: string;
}) {
  const form = useRef<HTMLFormElement>(null), valor = useRef<HTMLInputElement>(null);
  const [v, setV] = useState(ligado);
  return (
    <form ref={form} action={acao}>
      {Object.entries(campos ?? {}).map(([k, x]) => <input key={k} type="hidden" name={k} value={x} />)}
      <input ref={valor} type="hidden" name={nome} defaultValue="" />
      <LinhaConfiguracao rotulo={rotulo} descricao={descricao} interruptor={{
        ligado: v,
        onChange: (n) => { setV(n); if (valor.current) valor.current.value = n ? valorLigado : valorDesligado; form.current?.requestSubmit(); },
      }} />
    </form>
  );
}
