"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BotaoIcone } from "./Botao";
import { BarraProgresso } from "./Progresso";

/**
 * Tela cheia em cartões (DESIGN-SYSTEM.md seção 9.20): segmentos no topo (só mostram onde está, nunca avançam
 * sozinhos), título, ações do cartão atual e ✕; cartões lado a lado com scroll-snap nativo. Controlado: `atual` e
 * `onMudar` (deslizar, ‹ ›, setas do teclado). Esc fecha; o foco fica preso na camada e volta a quem abriu.
 */
export default function Historias({ titulo, cartoes, atual, onMudar, onFechar, acoes, rotulos }: {
  titulo: string; cartoes: ReactNode[]; atual: number; onMudar: (i: number) => void; onFechar: () => void;
  /** ⋯ do cartão atual (ou nada). */
  acoes?: ReactNode;
  rotulos: { fechar: string; anterior: string; proximo: string; posicao: string };
}) {
  const trilho = useRef<HTMLDivElement>(null), camada = useRef<HTMLDivElement>(null);
  const deQuem = useRef<Element | null>(null);
  // while a button/key scroll runs, the cards it passes must not take over `atual` (two quick → stopped halfway)
  const rolando = useRef(0);

  // abrir: guarda quem abriu, trava a rolagem da página, foca o ✕; fechar: devolve tudo
  useEffect(() => {
    deQuem.current = document.activeElement;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    camada.current?.querySelector<HTMLElement>("[data-fechar]")?.focus();
    return () => { document.body.style.overflow = antes; (deQuem.current as HTMLElement | null)?.focus?.(); };
  }, []);

  // o cartão visível manda no `atual` (deslizar com o dedo)
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const obs = new IntersectionObserver((es) => {
      if (Date.now() < rolando.current) return;
      for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.6) onMudar(Number((e.target as HTMLElement).dataset.i));
    }, { root: el, threshold: [0.6] });
    el.querySelectorAll("[data-i]").forEach((x) => obs.observe(x));
    return () => obs.disconnect();
  }, [cartoes.length, onMudar]);

  // `atual` mudou por botão ou teclado: rola até ele (sem animação se a pessoa pediu menos movimento)
  useEffect(() => {
    const el = trilho.current, alvo = el?.querySelector<HTMLElement>(`[data-i="${atual}"]`);
    if (!el || !alvo || Math.abs(el.scrollLeft - alvo.offsetLeft) < 4) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rolando.current = Date.now() + (suave ? 600 : 50);
    el.scrollTo({ left: alvo.offsetLeft, behavior: suave ? "smooth" : "auto" });
  }, [atual]);

  const ir = (i: number) => onMudar(Math.max(0, Math.min(cartoes.length - 1, i)));
  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onFechar(); return; }
    const alvo = e.target as HTMLElement;
    const digitando = alvo.closest("input, textarea, select, [contenteditable=true]");
    if (!digitando && e.key === "ArrowRight") { e.preventDefault(); ir(atual + 1); }
    if (!digitando && e.key === "ArrowLeft") { e.preventDefault(); ir(atual - 1); }
    if (e.key === "Tab") {
      // foco preso na camada
      const fs = [...(camada.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex='-1'])") ?? [])].filter((x) => x.offsetParent !== null);
      if (!fs.length) return;
      const [p, u] = [fs[0], fs[fs.length - 1]];
      if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
      else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
    }
  };

  // portal to the .v2 root: inside a page section with its own z-index (stacking context) the header and the nav painted over it
  return createPortal(
    <div ref={camada} role="dialog" aria-modal="true" aria-label={titulo} onKeyDown={teclas}
      className="fixed inset-0 z-50 flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] motion-safe:animate-[entrar-historias_220ms_ease]">
      <div className="mx-auto grid w-full max-w-[480px] gap-3 px-4 pt-3">
        <BarraProgresso valor={atual + 1} segmentos={cartoes.length} rotuloAcessivel={rotulos.posicao.replace("{n}", String(atual + 1)).replace("{t}", String(cartoes.length))} />
        <div className="flex items-center gap-2">
          <h2 className="titulo-secao min-w-0 flex-1 truncate">{titulo}</h2>
          {acoes}
          <BotaoIcone data-fechar icone="fechar" aria-label={rotulos.fechar} tamanho={44} onClick={onFechar} />
        </div>
      </div>
      <div className="relative mx-auto mt-3 flex min-h-0 w-full max-w-[480px] flex-1">
        {/* computador: setas ao lado da coluna */}
        <div className="pointer-events-none absolute inset-y-0 -left-16 -right-16 hidden items-center justify-between md:flex">
          <BotaoIcone icone="voltar" aria-label={rotulos.anterior} tamanho={44} className="pointer-events-auto" disabled={atual === 0} onClick={() => ir(atual - 1)} />
          <BotaoIcone icone="avancar" aria-label={rotulos.proximo} tamanho={44} className="pointer-events-auto" disabled={atual === cartoes.length - 1} onClick={() => ir(atual + 1)} />
        </div>
        <div ref={trilho} className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {cartoes.map((c, i) => (
            <section key={i} data-i={i} aria-hidden={i !== atual} inert={i !== atual} aria-roledescription="cartão"
              className="historia-cartao flex w-full shrink-0 snap-center flex-col px-4 pb-4">
              {c}
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.querySelector(".v2") ?? document.body,
  );
}
