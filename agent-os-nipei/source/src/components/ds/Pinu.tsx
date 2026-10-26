"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Identidade visual do Pinu, o assistente (DESIGN-SYSTEM.md seções 8 e 10.11).
// Brilho só aqui e no que é do Pinu (regra 4). Com menos movimento pedido pelo aparelho, o orbe fica parado.

export type EstadoPinu = "repouso" | "ouvindo" | "pensando" | "falando";

// respiração (forma) e giro por estado — seção 8: repouso 9 s · ouvindo 4 s · pensando 2,4 s · falando 5 s
const RITMO: Record<EstadoPinu, { m: string; r: string }> = {
  repouso: { m: "9s", r: "24s" },
  ouvindo: { m: "4s", r: "18s" },
  pensando: { m: "2.4s", r: "5s" },
  falando: { m: "5s", r: "16s" },
};
const NOME: Record<EstadoPinu, string> = { repouso: "em repouso", ouvindo: "ouvindo", pensando: "pensando", falando: "falando" };

/**
 * Orbe do Pinu. `nivelAudio` (0–1), no estado "ouvindo", faz o orbe crescer com a voz; sem ele o orbe
 * imita uma voz. Pensando = gira rápido e encolhe; falando = pulsa.
 */
export function OrbePinu({ estado = "repouso", tamanho = 160, nivelAudio, className }: {
  estado?: EstadoPinu; tamanho?: number; nivelAudio?: number; className?: string;
}) {
  const orbe = useRef<HTMLSpanElement>(null);
  const nivel = useRef(nivelAudio);
  nivel.current = nivelAudio;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let fase = 0, quadro = 0;
    const passo = () => {
      fase += 0.06;
      let s = 1;
      if (estado === "repouso") s = 1 + Math.sin(fase * 0.5) * 0.02;
      if (estado === "ouvindo") s = nivel.current != null ? 1 + Math.max(0, Math.min(1, nivel.current)) * 0.12 : 1 + Math.abs(Math.sin(fase * 2.3) * Math.sin(fase * 0.9)) * 0.09;
      if (estado === "pensando") s = 0.96 + Math.sin(fase * 1.2) * 0.02;
      if (estado === "falando") s = 1 + Math.max(0, Math.sin(fase * 3.1)) * 0.06 * (0.6 + 0.4 * Math.sin(fase * 0.7));
      orbe.current?.style.setProperty("--s", s.toFixed(3));
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [estado]);
  return (
    <span role="img" aria-label={`Pinu ${NOME[estado]}`} className={`relative inline-grid place-items-center ${className ?? ""}`} style={{ width: tamanho, height: tamanho }}>
      <span aria-hidden="true" className="orbe-pinu-brilho" style={{ opacity: estado === "repouso" ? 0.7 : 1 }} />
      <span ref={orbe} aria-hidden="true" className="orbe-pinu" style={{ "--m": RITMO[estado].m, "--r": RITMO[estado].r } as CSSProperties} />
    </span>
  );
}

/** Mini-anel: o avatar do Pinu em mensagens, campos e chips (anel em conic-gradient com brilho). */
export function MiniAnelPinu({ tamanho = 22, className }: { tamanho?: number; className?: string }) {
  return <span aria-hidden="true" className={`mini-anel ${className ?? ""}`} style={{ "--anel": `${tamanho}px` } as CSSProperties} />;
}

/** Chip "Sugerido pelo Pinu" (seção 9.6): fundo verde suave + mini-anel + texto em acento. */
export function ChipPinu({ children = "Sugerido pelo Pinu", onClick }: { children?: ReactNode; onClick?: () => void }) {
  const cls = "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-pilula bg-ac-soft pl-2 pr-3.5 font-texto text-sm font-semibold text-ac-text";
  const dentro = <><MiniAnelPinu tamanho={18} />{children}</>;
  return onClick
    ? <button type="button" onClick={onClick} className={`anel-foco ${cls} transition-[filter] duration-150 hover:brightness-110`}>{dentro}</button>
    : <span className={cls}>{dentro}</span>;
}
