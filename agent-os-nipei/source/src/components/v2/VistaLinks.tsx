"use client";

import { useRouter } from "next/navigation";
import Abas, { type ItemAba } from "@/components/ds/Abas";
import Segmentado, { type OpcaoSegmentado } from "@/components/ds/Segmentado";

// Abas e seletor segmentado do design system quando cada opção é uma URL (a página é do servidor).

export function AbasLinks({ itens, ativa, rotulo }: { itens: (ItemAba & { href: string })[]; ativa: string; rotulo: string }) {
  const router = useRouter();
  return <Abas itens={itens} ativa={ativa} rotulo={rotulo} onChange={(id) => router.push(itens.find((i) => i.id === id)!.href, { scroll: false })} />;
}

export function SegmentadoLinks<V extends string>({ opcoes, valor, rotulo }: { opcoes: (OpcaoSegmentado<V> & { href: string })[]; valor: V; rotulo: string }) {
  const router = useRouter();
  return <Segmentado soIcone opcoes={opcoes} valor={valor} rotulo={rotulo} onChange={(v) => router.push(opcoes.find((o) => o.valor === v)!.href, { scroll: false })} />;
}
