"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { useConfirmar, type PedidoConfirmacao } from "./Dialogo";

// Menu de ações ⋯ (DESIGN-SYSTEM.md seção 9.19): cartão flutuante s2 + contorno de 1 px, raio 16, itens de
// 44 px com ícone + texto, divisor antes das ações sensíveis. "Remover…" abre o diálogo (o vermelho fica lá,
// nunca no menu). O botão ⋯ ganha anel de acento enquanto o menu está aberto.
// Teclado: Enter/Espaço/↓ abre e foca o 1º item · ↑ ↓ Home End navegam · Esc fecha e volta ao botão.

export type ItemMenu = {
  icone: NomeIcone; rotulo: string;
  onSelect?: () => void; href?: string;
  /** Ação que tira algo: vai depois de um divisor. */
  sensivel?: boolean;
  /** Pergunta antes (ex.: Remover…): só chama onSelect se a pessoa confirmar. */
  confirmar?: PedidoConfirmacao;
};

/** `alinhar` é só o lado inicial: ao abrir, o menu vai na direção do centro da tela. */
export default function MenuAcoes({ itens, rotulo = "Mais opções", alinhar = "direita" }: { itens: ItemMenu[]; rotulo?: string; alinhar?: "direita" | "esquerda" }) {
  const [aberto, setAberto] = useState(false);
  const [lado, setLado] = useState(alinhar);
  /** Abre na direção do centro da tela: nunca por baixo do menu lateral nem para fora da borda. */
  const abrir = () => {
    const r = botao.current?.getBoundingClientRect();
    if (r) setLado(r.left + r.width / 2 < window.innerWidth / 2 ? "esquerda" : "direita");
    setAberto(true);
  };
  const caixa = useRef<HTMLDivElement>(null), botao = useRef<HTMLButtonElement>(null);
  const id = useId();
  const confirmar = useConfirmar();
  const router = useRouter();
  const ordenados = [...itens.filter((i) => !i.sensivel), ...itens.filter((i) => i.sensivel)];
  const primeiroSensivel = ordenados.findIndex((i) => i.sensivel);

  const focar = (n: number) => {
    const lista = caixa.current?.querySelectorAll<HTMLElement>("[role=menuitem]");
    if (lista?.length) lista[(n + lista.length) % lista.length].focus();
  };
  const fechar = (voltarFoco = true) => { setAberto(false); if (voltarFoco) botao.current?.focus(); };

  useEffect(() => {
    if (!aberto) return;
    requestAnimationFrame(() => focar(0));
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const teclasMenu = (e: KeyboardEvent) => {
    const lista = [...(caixa.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focar(i + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focar(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); focar(0); }
    else if (e.key === "End") { e.preventDefault(); focar(lista.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); fechar(); }
    else if (e.key === "Tab") setAberto(false);
  };

  const escolher = async (item: ItemMenu) => {
    fechar(false);
    if (item.confirmar && !(await confirmar(item.confirmar))) { botao.current?.focus(); return; }
    if (item.href) router.push(item.href);
    item.onSelect?.();
  };

  return (
    <div ref={caixa} className="relative inline-block" onKeyDown={aberto ? teclasMenu : undefined}>
      <button ref={botao} type="button" aria-label={rotulo} title={rotulo} aria-haspopup="menu" aria-expanded={aberto} aria-controls={aberto ? id : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={(e) => { if (!aberto && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } }}
        className={`anel-foco inline-grid size-11 place-items-center rounded-pilula text-t1 transition-[background-color,box-shadow] duration-150 lg:size-10 ${aberto ? "bg-s2 shadow-[0_0_0_1.5px_var(--ac)]" : "hover:bg-s2"}`}>
        <Icone nome="mais-opcoes" tamanho={20} />
      </button>
      {aberto && (
        <div id={id} role="menu" aria-label={rotulo}
          className={`absolute top-full z-50 mt-2 flex min-w-[230px] flex-col rounded-[16px] bg-s2 p-1.5 shadow-[0_0_0_1px_var(--s3)] ${lado === "direita" ? "right-0" : "left-0"}`}>
          {ordenados.map((item, i) => (
            <div key={i} className="contents">
              {i === primeiroSensivel && i > 0 && <hr className="mx-1.5 my-1 h-px border-0 bg-s3" />}
              <button type="button" role="menuitem" tabIndex={-1} onClick={() => escolher(item)}
                className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-left font-texto text-sm font-medium text-t1 outline-none hover:bg-s3 focus:bg-s3">
                <Icone nome={item.icone} tamanho={18} className="text-t2" />
                {item.rotulo}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
