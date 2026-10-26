// Sem "use client": o layout raiz (servidor) usa SCRIPT_TEMA; components/ds/Tema.tsx usa o resto.
export type ValorTema = "escuro" | "claro" | "sistema";
export const TEMA_COOKIE = "nipei_tema";
export const TEMA_PADRAO: ValorTema = "escuro";

/** Inline no <head>: lê o cookie e põe data-tema antes de qualquer pintura (Sistema = sem atributo). */
export const SCRIPT_TEMA = `(function(){try{var m=document.cookie.match(/(?:^|; )${TEMA_COOKIE}=(escuro|claro|sistema)/);var v=m?m[1]:"${TEMA_PADRAO}";if(v==="sistema")document.documentElement.removeAttribute("data-tema");else document.documentElement.setAttribute("data-tema",v);}catch(e){}})();`;
