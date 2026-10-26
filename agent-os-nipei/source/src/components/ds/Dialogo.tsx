"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Botao from "./Botao";
import { CirculoEstado, lavagem, type EstadoAviso } from "./Aviso";

// Diálogo de confirmação (DESIGN-SYSTEM.md seção 9.10): o cartão do aviso, centralizado, com o fundo
// escurecido. Usa o <dialog> nativo com showModal(): foco preso dentro, Esc fecha, o resto da página fica
// inerte. Substitui o confirm() do navegador. Ações: [Cancelar (tonal)] [Remover (destrutivo)].

export type PedidoConfirmacao = {
  titulo: string; mensagem?: ReactNode; confirmarRotulo?: string; cancelarRotulo?: string;
  /** Ação que tira algo (remover, desconectar): botão vermelho — o único lugar onde o vermelho aparece (regra 9). */
  perigoso?: boolean; estado?: EstadoAviso;
};

export function Dialogo({ aberto, pedido, onResposta }: { aberto: boolean; pedido: PedidoConfirmacao | null; onResposta: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  const estado: EstadoAviso = pedido?.estado ?? (pedido?.perigoso ? "erro" : "info");
  return (
    <dialog ref={ref} aria-labelledby="dialogo-titulo" onCancel={(e) => { e.preventDefault(); onResposta(false); }}
      onClick={(e) => { if (e.target === e.currentTarget) onResposta(false); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-cartao bg-transparent p-0 text-t1 backdrop:bg-bg/75 backdrop:backdrop-blur-[2px]">
      {pedido && (
        <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 rounded-cartao bg-s1 p-5 ring-1 ring-inset ring-s3" style={lavagem(estado)}>
          <span className="row-span-2"><CirculoEstado estado={estado} /></span>
          <h2 id="dialogo-titulo" className="titulo-cartao self-center">{pedido.titulo}</h2>
          {pedido.mensagem ? <div className="corpo text-t2">{pedido.mensagem}</div> : <span />}
          <div className="col-span-2 mt-3 flex flex-wrap justify-end gap-2">
            {/* foco começa no Cancelar: Enter sem querer não remove nada */}
            <Botao icone="fechar" variante="tonal" tamanho="M" autoFocus onClick={() => onResposta(false)}>{pedido.cancelarRotulo ?? "Cancelar"}</Botao>
            <Botao icone={pedido.perigoso ? "lixeira" : "confirmar"} variante={pedido.perigoso ? "destrutivo" : "primario"} tamanho="M" onClick={() => onResposta(true)}>{pedido.confirmarRotulo ?? "Confirmar"}</Botao>
          </div>
        </div>
      )}
    </dialog>
  );
}

const Contexto = createContext<((p: PedidoConfirmacao) => Promise<boolean>) | null>(null);

/** `const confirmar = useConfirmar(); if (await confirmar({ titulo, mensagem, confirmarRotulo: "Remover", perigoso: true })) …` */
export function useConfirmar() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useConfirmar precisa de <ProvedorConfirmar> (está no layout da v2)");
  return c;
}

export function ProvedorConfirmar({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const confirmar = useCallback((p: PedidoConfirmacao) => new Promise<boolean>((res) => {
    resolver.current?.(false); // um pedido novo cancela o anterior
    resolver.current = res;
    setPedido(p);
  }), []);
  const responder = (ok: boolean) => { resolver.current?.(ok); resolver.current = null; setPedido(null); };
  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <Dialogo aberto={!!pedido} pedido={pedido} onResposta={responder} />
    </Contexto.Provider>
  );
}
