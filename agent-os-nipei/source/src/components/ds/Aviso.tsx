"use client";

import type { ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { BotaoIcone } from "./Botao";

// Aviso (DESIGN-SYSTEM.md seção 9.10): cartão s1 com lavagem suave da cor do estado vinda do canto
// superior esquerdo (tinta, não brilho), ícone num círculo da cor do estado, título, mensagem, ações, ✕.

export type EstadoAviso = "sucesso" | "atencao" | "erro" | "info";
export const ESTADO_AVISO: Record<EstadoAviso, { token: string; icone: NomeIcone }> = {
  sucesso: { token: "--ok", icone: "sucesso" },
  atencao: { token: "--warn", icone: "atencao" },
  erro: { token: "--err", icone: "erro" },
  info: { token: "--info", icone: "informacao" },
};
/** Fundo com a lavagem do estado (também usado pelo toast e pelo diálogo). */
export const lavagem = (e: EstadoAviso, forma: "canto" | "lado" = "canto") => ({
  backgroundImage: forma === "canto"
    ? `radial-gradient(120% 140% at 0 0, color-mix(in srgb, var(${ESTADO_AVISO[e].token}) 22%, transparent), transparent 55%)`
    : `radial-gradient(80% 160% at 0 50%, color-mix(in srgb, var(${ESTADO_AVISO[e].token}) 22%, transparent), transparent 60%)`,
});

export function CirculoEstado({ estado, tamanho = 36 }: { estado: EstadoAviso; tamanho?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-pilula text-eq-ink" style={{ width: tamanho, height: tamanho, background: `var(${ESTADO_AVISO[estado].token})` }}>
      <Icone nome={ESTADO_AVISO[estado].icone} tamanho={Math.round(tamanho / 2)} />
    </span>
  );
}

export default function Aviso({ estado, titulo, mensagem, acoes, progresso, onFechar, rotuloFechar = "Fechar", className }: {
  estado: EstadoAviso; titulo: ReactNode; mensagem?: ReactNode; acoes?: ReactNode; progresso?: number; onFechar?: () => void; rotuloFechar?: string; className?: string;
}) {
  return (
    <div role={estado === "erro" ? "alert" : "status"} className={`relative grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 rounded-cartao bg-s1 p-4 ${onFechar ? "pr-14" : ""} ${className ?? ""}`} style={lavagem(estado)}>
      <span className="row-span-3"><CirculoEstado estado={estado} /></span>
      <p className="titulo-cartao self-center">{titulo}</p>
      {mensagem && <div className="corpo text-t2">{mensagem}</div>}
      {progresso != null && (
        <div className="col-start-2 mt-1.5 flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-pilula bg-s3"><span className="block h-full rounded-pilula" style={{ width: `${Math.max(0, Math.min(100, progresso))}%`, background: `var(${ESTADO_AVISO[estado].token})` }} /></span>
          <span className="meta text-t2">{Math.round(progresso)}%</span>
        </div>
      )}
      {acoes && <div className="col-start-2 mt-2 flex flex-wrap gap-2">{acoes}</div>}
      {onFechar && <span className="absolute right-2 top-2"><BotaoIcone icone="fechar" aria-label={rotuloFechar} tamanho={40} variante="fantasma" onClick={onFechar} /></span>}
    </div>
  );
}
