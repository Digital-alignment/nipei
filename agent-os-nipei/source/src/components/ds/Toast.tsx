"use client";

import Link from "next/link";
import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CirculoEstado, lavagem, type EstadoAviso } from "./Aviso";

// Toast (DESIGN-SYSTEM.md seção 9.10): a lavagem do aviso numa pílula compacta, ícone + uma frase.
// Some sozinho; leitores de tela anunciam (aria-live="polite"). Substitui as faixas verdes de "ok".

type Acao = { rotulo: string; href: string };
type Item = { id: number; estado: EstadoAviso; texto: string; acao?: Acao };
type Disparar = (texto: string, opcoes?: { acao?: Acao }) => void;
export type ApiToast = { sucesso: Disparar; erro: Disparar; info: Disparar; atencao: Disparar };

const Contexto = createContext<ApiToast | null>(null);

export function useToast(): ApiToast {
  const c = useContext(Contexto);
  if (!c) throw new Error("useToast precisa de <ProvedorToast> (está no layout da v2)");
  return c;
}

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const seq = useRef(0);
  const tirar = useCallback((id: number) => setItens((l) => l.filter((x) => x.id !== id)), []);
  const disparar = useCallback((estado: EstadoAviso): Disparar => (texto, opcoes) => {
    const id = ++seq.current;
    setItens((l) => [...l.slice(-2), { id, estado, texto, acao: opcoes?.acao }]); // no máximo 3 na tela
    setTimeout(() => tirar(id), opcoes?.acao ? 7000 : 4000);
  }, [tirar]);
  const api = useMemo<ApiToast>(() => ({ sucesso: disparar("sucesso"), erro: disparar("erro"), info: disparar("info"), atencao: disparar("atencao") }), [disparar]);
  return (
    <Contexto.Provider value={api}>
      {children}
      <div aria-live="polite" role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[120] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {itens.map((t) => (
          <div key={t.id} className="pointer-events-auto inline-flex max-w-full items-center gap-2.5 rounded-pilula bg-s1 py-2 pl-2 pr-4 ring-1 ring-inset ring-s3" style={lavagem(t.estado, "lado")}>
            <CirculoEstado estado={t.estado} tamanho={30} />
            <span className="corpo min-w-0 text-t1">{t.texto}</span>
            {t.acao && <Link href={t.acao.href} onClick={() => tirar(t.id)} className="anel-foco shrink-0 rounded-pilula px-2 py-1 text-sm font-semibold text-ac-text underline-offset-2 hover:underline">{t.acao.rotulo}</Link>}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

/**
 * Mostra um toast uma vez quando a página abre com um parâmetro de "deu certo" na URL (ex.: ?ok=…) e
 * tira o parâmetro da URL (recarregar não repete). Para server actions que voltam com redirect.
 */
type PropsAoAbrir = { texto?: string; parametro?: string; estado?: EstadoAviso; acao?: Acao };
export function ToastAoAbrir(props: PropsAoAbrir) {
  return <Suspense><ToastAoAbrirInterno {...props} /></Suspense>; // useSearchParams pede Suspense
}
function ToastAoAbrirInterno({ texto, parametro = "ok", estado = "sucesso", acao }: PropsAoAbrir) {
  const toast = useToast();
  const path = usePathname(), params = useSearchParams();
  const feito = useRef(false);
  useEffect(() => {
    if (!texto || feito.current) return;
    feito.current = true;
    ({ sucesso: toast.sucesso, erro: toast.erro, info: toast.info, atencao: toast.atencao })[estado](texto, { acao });
    const p = new URLSearchParams(params.toString());
    p.delete(parametro);
    window.history.replaceState(null, "", `${path}${p.size ? `?${p}` : ""}${window.location.hash}`);
  }, [texto, estado, acao, parametro, params, path, toast]);
  return null;
}
