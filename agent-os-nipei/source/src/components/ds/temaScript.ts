// Sem "use client": o layout raiz (servidor) usa SCRIPT_TEMA; components/ds/Tema.tsx usa o resto.
export type ValorTema = "escuro" | "claro" | "sistema";
export const TEMA_COOKIE = "nipei_tema";
// TRANSIÇÃO: o design system pede Escuro como padrão, mas as telas ainda não migradas seguem o tema do
// aparelho (classes `dark:`). Enquanto houver telas antigas, o padrão é "sistema" para que os componentes
// novos (Chip, Avatar…) dentro delas tenham o mesmo tema da tela. Quando a migração terminar: "escuro".
export const TEMA_PADRAO: ValorTema = "escuro"; // o padrão do design system (todas as telas da v2 migradas em 2026-10-26)

/** Inline no <head>: lê o cookie e põe data-tema antes de qualquer pintura (Sistema = sem atributo). */
export const SCRIPT_TEMA = `(function(){try{var m=document.cookie.match(/(?:^|; )${TEMA_COOKIE}=(escuro|claro|sistema)/);var v=m?m[1]:"${TEMA_PADRAO}";if(v==="sistema")document.documentElement.removeAttribute("data-tema");else document.documentElement.setAttribute("data-tema",v);}catch(e){}})();`;
