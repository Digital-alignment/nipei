// Campo compacto (DESIGN-SYSTEM.md 9.5): select/input dentro de uma linha densa — tabela, barra de lote, atribuir na lista.
// Sem rótulo visível: use aria-label. 44 px no celular, 36 px a partir de sm.
// Fica fora de Campo.tsx ("use client"): exportada de lá, chegava às páginas do servidor como referência de cliente, não como texto.
export const CAMPO_COMPACTO = "anel-foco h-11 sm:h-9 rounded-pilula bg-s2 px-3 font-texto text-sm text-t1 outline-none focus:shadow-foco disabled:text-t3";
