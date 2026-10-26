import type { SVGProps } from "react";
import { ICONES, type NomeIcone } from "./icones.generated";

// Ícone funcional do Nipëi (DESIGN-SYSTEM.md seção 7): um path, fill="currentColor", herda a cor do texto.
// Tamanhos de uso: 14 · 16 · 18 · 20 · 22 · 24. Decorativo por padrão (aria-hidden); com aria-label vira role="img".
// Para trocar/adicionar um ícone: SVG em design-assets/icones/funcionais/ + `npm run icones`.

export type { NomeIcone };
type Props = { nome: NomeIcone; tamanho?: number; className?: string; "aria-label"?: string } & Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "children">;

export default function Icone({ nome, tamanho = 20, className, "aria-label": rotulo, ...resto }: Props) {
  const { viewBox, d } = ICONES[nome];
  return (
    <svg viewBox={viewBox} width={tamanho} height={tamanho} fill="currentColor" className={className} focusable="false"
      {...(rotulo ? { role: "img", "aria-label": rotulo } : { "aria-hidden": true })} {...resto}>
      <path d={d} />
    </svg>
  );
}
