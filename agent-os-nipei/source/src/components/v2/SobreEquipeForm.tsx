"use client";
import { useState } from "react";
import { rascunhoSobreAction, sobreEquipeAction } from "@/app/(v2)/actions";
import Botao from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";

type Secao = { id: string; rotulo: string; ajuda: string };

/** "Sobre a equipe" (DS 10.13) with "Rascunho com o Pinu": the draft fills the fields; only "Salvar" writes. */
export default function SobreEquipeForm({ equipe, secoes, inicial, l }: {
  equipe: string; secoes: Secao[]; inicial: Record<string, string>;
  l: { salvar: string; rascunho: string; aviso: string; pensando: string };
}) {
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const rascunho = async () => {
    setPensando(true); setErro("");
    const r = await rascunhoSobreAction(equipe, valores).catch((e: Error) => ({ error: e.message, rascunho: undefined }));
    setPensando(false);
    if (r.rascunho) setValores(r.rascunho); else setErro(r.error ?? "");
  };
  return (
    <form action={sobreEquipeAction}>
      <input type="hidden" name="equipe" value={equipe} />
      <Cartao className="gap-3">
        <div className="grid gap-1.5">
          <div><Botao type="button" variante="tonal" tamanho="M" icone="gerar-outra" carregando={pensando} textoCarregando={l.pensando} onClick={rascunho}>{l.rascunho}</Botao></div>
          <p className={`meta ${erro ? "text-err" : "text-t3"}`} aria-live="polite">{erro || l.aviso}</p>
        </div>
        {secoes.map((s) => (
          <Campo key={s.id} tipo="area" name={s.id} rotulo={s.rotulo} ajuda={s.ajuda} value={valores[s.id] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [s.id]: e.target.value }))} maxLength={1500} rows={5} />
        ))}
        <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{l.salvar}</BotaoEnviar></div>
      </Cartao>
    </form>
  );
}
