"use client";
import { useEffect, useRef, useState } from "react";
import { pedirAction, sugerirPedidoAction, usouSugestaoAction } from "@/app/(v2)/actions";
import type { Aplicada, SugestaoTarefa } from "@/lib/v2/sugestaoTarefa";
import Campo, { SugestaoPinu } from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";

type L = Record<"paraEquipe" | "oQuePrecisa" | "detalhes" | "ateQuando" | "enviarPedido", string>;

/** "Pedir algo a uma equipe" (DS 10.14): with no team chosen yet, the Pinu suggests the team and the due date from the text. */
export default function PedidoForm({ equipes, equipeFixa, hoje, l }: { equipes: { id: string; nome: string }[]; equipeFixa?: string; hoje: string; l: L }) {
  const [equipe, setEquipe] = useState("");
  const [prazo, setPrazo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sug, setSug] = useState<{ s: SugestaoTarefa; texto: string } | null>(null);
  const [pensando, setPensando] = useState(false);
  const [aplicada, setAplicada] = useState<Aplicada | null>(null);
  const pedido = useRef("");
  const descrever = (s: SugestaoTarefa) => {
    const dia = s.prazo ? new Date(`${s.prazo}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "";
    const partes = [equipes.find((e) => e.id === s.equipe)?.nome, dia].filter(Boolean);
    return partes.length ? `${partes.join(" · ")}${s.motivo ? ` — ${s.motivo}` : ""}` : "";
  };
  const pedir = async (outra: boolean) => {
    const t = titulo.trim();
    pedido.current = t;
    setPensando(true);
    const r = await sugerirPedidoAction(t, descricao, outra ? sug?.texto : undefined).catch(() => ({ sugestao: undefined }));
    if (pedido.current !== t) return; // a newer title wins
    setPensando(false);
    const texto = r.sugestao ? descrever(r.sugestao) : "";
    setSug(r.sugestao && texto ? { s: r.sugestao, texto } : null);
  };
  useEffect(() => {
    const t = titulo.trim();
    if (equipeFixa || t.length < 12 || t === pedido.current) return;
    const h = setTimeout(() => pedir(false), 1500);
    return () => clearTimeout(h);
  }, [titulo]); // eslint-disable-line react-hooks/exhaustive-deps
  const usar = () => {
    if (!sug) return;
    if (sug.s.equipe) setEquipe(sug.s.equipe);
    if (sug.s.prazo) setPrazo(sug.s.prazo);
    setAplicada({ equipe: sug.s.equipe || undefined, prazo: sug.s.prazo || undefined });
    void usouSugestaoAction("pedido").catch(() => {});
    setSug(null);
  };

  return (
    <form action={pedirAction}>
      {aplicada && <input type="hidden" name="sugestao_pinu" value={JSON.stringify(aplicada)} />}
      <Cartao className="gap-3">
        <Campo tipo="titulo" name="titulo" rotulo={l.oQuePrecisa} required minLength={3} maxLength={200} onChange={(e) => setTitulo(e.target.value)}
          sugestao={!equipeFixa && (pensando || sug) ? <SugestaoPinu texto={sug?.texto ?? ""} carregando={pensando} onUsar={usar} onOutra={() => pedir(true)} /> : undefined} />
        {equipeFixa ? <input type="hidden" name="equipe" value={equipeFixa} /> : (
          <Campo tipo="selecao" name="equipe" rotulo={l.paraEquipe} required value={equipe} onChange={(e) => setEquipe(e.target.value)}>
            <option value="" disabled>—</option>
            {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Campo>
        )}
        <Campo tipo="area" name="descricao" rotulo={l.detalhes} maxLength={3000} onChange={(e) => setDescricao(e.target.value)} />
        <Campo tipo="data" name="prazo" rotulo={l.ateQuando} min={hoje} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        <div><BotaoEnviar enviando="…" icone="enviar" variante="primario">{l.enviarPedido}</BotaoEnviar></div>
      </Cartao>
    </form>
  );
}
