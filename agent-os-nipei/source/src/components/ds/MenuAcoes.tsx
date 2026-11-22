"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { useConfirmar, type PedidoConfirmacao } from "./Dialogo";

// Menu de ações ⋯ (DESIGN-SYSTEM.md seção 9.19): cartão flutuante s2 + contorno de 1 px, raio 16, itens de
// 44 px com ícone + texto, divisor antes das ações sensíveis. "Remover…" abre o diálogo (o vermelho fica lá,
// nunca no menu). O botão ⋯ ganha anel de acento enquanto o menu está aberto.
// Teclado: Enter/Espaço/↓ abre e foca o 1º item · ↑ ↓ Home End navegam · Esc fecha e volta ao botão.

export type ItemMenu = {
  icone: NomeIcone; rotulo: string;
  onSelect?: () => void; href?: string;
  /** Server action: the menu closes, sends `campos` as the form and refreshes the page. */
  acao?: (form: FormData) => unknown; campos?: Record<string, string>;
  /** Only below `sm` (the same action already has its own button on larger screens). */
  soCelular?: boolean;
  /** Ação que tira algo: vai depois de um divisor. */
  sensivel?: boolean;
  /** Abre o Pinu com um pedido (DS 9.19/10.5.1): serializável, serve em listas desenhadas no servidor. */
  pinu?: { texto?: string; preencher?: string; atalho?: string };
  /** Pergunta antes (ex.: Remover…): só chama onSelect se a pessoa confirmar. */
  confirmar?: PedidoConfirmacao;
};

/**
 * `alinhar` é só o lado inicial: ao abrir, o menu vai na direção do centro da tela.
 * `gatilho="criar"`: o "+" flutuante (56 px no computador, 48 no celular, acento com anel do fundo) que abre o menu de criar
 * (fundo escurecido, título, itens com ícone em quadrado); o menu abre para cima.
 * No celular some enquanto a página desce e volta ao subir (não fica por cima do que se lê).
 */
export default function MenuAcoes({ itens, rotulo = "Mais opções", alinhar = "direita", gatilho = "mais-opcoes" }: { itens: ItemMenu[]; rotulo?: string; alinhar?: "direita" | "esquerda"; gatilho?: "mais-opcoes" | "criar" }) {
  const criar = gatilho === "criar";
  const [aberto, setAberto] = useState(false);
  const [lado, setLado] = useState(alinhar);
  // ⋯ menus are fixed to the button: inside a list with overflow-hidden (rounded cards) an absolute menu was cut off
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  /** Abre na direção do centro da tela: nunca por baixo do menu lateral nem para fora da borda; para cima se não cabe embaixo. */
  const abrir = () => {
    const r = botao.current?.getBoundingClientRect();
    if (r) {
      const esq = r.left + r.width / 2 < window.innerWidth / 2;
      setLado(esq ? "esquerda" : "direita");
      const altura = Math.min(56 * itens.length + 12, 420), cabeEmbaixo = r.bottom + 8 + altura < window.innerHeight - 96;
      setPos({ ...(cabeEmbaixo ? { top: r.bottom + 8 } : { bottom: window.innerHeight - r.top + 8 }), ...(esq ? { left: r.left } : { right: window.innerWidth - r.right }) });
    }
    setAberto(true);
  };
  const caixa = useRef<HTMLDivElement>(null), botao = useRef<HTMLButtonElement>(null);
  const id = useId();
  const confirmar = useConfirmar();
  const router = useRouter();
  const [, iniciar] = useTransition();
  // "+": hidden while scrolling down (phones only, by CSS), back when scrolling up or near the top
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    if (!criar) return;
    let ultimo = window.scrollY;
    const rolar = () => {
      const y = window.scrollY;
      if (y < 80 || y < ultimo - 8) setOculto(false); else if (y > ultimo + 8) setOculto(true);
      if (Math.abs(y - ultimo) > 8) ultimo = y;
    };
    window.addEventListener("scroll", rolar, { passive: true });
    return () => window.removeEventListener("scroll", rolar);
  }, [criar]);
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
    // fixed menu: closes when the page scrolls instead of floating away from its button
    const rolou = () => { if (!criar) setAberto(false); };
    window.addEventListener("scroll", rolou, { passive: true });
    return () => { document.removeEventListener("pointerdown", fora); window.removeEventListener("scroll", rolou); };
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
    if (item.pinu) window.dispatchEvent(new CustomEvent("nipei:assistente", { detail: item.pinu })); // ABRIR_ASSISTENTE (components/v2)
    item.onSelect?.();
    if (item.acao) {
      const f = new FormData();
      for (const [k, v] of Object.entries(item.campos ?? {})) f.set(k, v);
      const acao = item.acao;
      iniciar(async () => { await acao(f); router.refresh(); });
    }
  };

  return (
    <div ref={caixa} onKeyDown={aberto ? teclasMenu : undefined}
      className={`relative inline-block ${criar ? `transition-[transform,opacity] duration-200 ${oculto && !aberto ? "max-md:pointer-events-none max-md:translate-y-6 max-md:opacity-0" : ""}` : ""}`}>
      <button ref={botao} type="button" aria-label={rotulo} title={rotulo} aria-haspopup="menu" aria-expanded={aberto} aria-controls={aberto ? id : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={(e) => { if (!aberto && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } }}
        className={criar
          ? "anel-foco relative z-50 inline-grid size-12 place-items-center rounded-pilula bg-ac text-ac-ink shadow-[0_0_0_4px_var(--bg),0_10px_28px_-8px_var(--bg)] transition-transform duration-150 hover:bg-ac-press active:scale-95 md:size-14"
          : `anel-foco inline-grid size-11 place-items-center rounded-pilula text-t1 transition-[background-color,box-shadow] duration-150 lg:size-10 ${aberto ? "bg-s2 shadow-[0_0_0_1.5px_var(--ac)]" : "hover:bg-s2"}`}>
        <Icone nome={criar ? "mais" : "mais-opcoes"} tamanho={criar ? 24 : 20} className={criar ? `transition-transform duration-150 ${aberto ? "rotate-45" : ""}` : undefined} />
      </button>
      {/* criar: the page dims and blurs behind the menu (a tap outside closes it, via the pointerdown listener) */}
      {aberto && criar && <div aria-hidden="true" className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm transition-opacity duration-150 starting:opacity-0" />}
      {aberto && (
        <div id={id} role="menu" aria-label={rotulo} style={criar ? undefined : pos}
          className={criar
            ? `absolute bottom-full z-50 mb-4 flex w-[264px] flex-col rounded-bloco bg-s2 p-2 shadow-[0_0_0_1px_var(--s3)] transition-[opacity,transform] duration-150 starting:translate-y-2 starting:opacity-0 ${lado === "direita" ? "right-0" : "left-0"}`
            : "fixed z-50 flex max-h-[420px] min-w-[230px] flex-col overflow-y-auto rounded-[16px] bg-s2 p-1.5 shadow-[0_0_0_1px_var(--s3)]"}>
          {criar && <p className="rotulo-maiusculo px-3 pb-1 pt-2 text-t2">{rotulo}</p>}
          {ordenados.map((item, i) => (
            <div key={i} className="contents">
              {i === primeiroSensivel && i > 0 && <hr className="mx-1.5 my-1 h-px border-0 bg-s3" />}
              <button type="button" role="menuitem" tabIndex={-1} onClick={() => escolher(item)}
                className={`group/item flex items-center text-left font-texto font-medium text-t1 outline-none hover:bg-s3 focus:bg-s3 ${criar ? "min-h-[52px] gap-3 rounded-interno px-2 text-[15px]" : "min-h-11 gap-2.5 rounded-[10px] px-3 text-sm"} ${item.soCelular ? "sm:hidden" : ""}`}>
                {criar
                  ? <span className="grid size-9 shrink-0 place-items-center rounded-interno bg-s3 text-t1 group-hover/item:bg-s4 group-focus/item:bg-s4"><Icone nome={item.icone} tamanho={18} /></span>
                  : <Icone nome={item.icone} tamanho={18} className="text-t2" />}
                {item.rotulo}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
