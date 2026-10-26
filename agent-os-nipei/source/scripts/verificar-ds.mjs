// Guarda do design system (docs/design-system/DESIGN-SYSTEM.md): falha (exit 1) se a v2 voltar a usar o que o
// documento proíbe. Uso: npm run verificar:ds  (roda sozinho antes de `npm run build`, inclusive no deploy).
// Exceção pontual: a linha anterior contém "ds-permitido: <motivo>" (ex.: o logo oficial do Google no Login).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PASTAS = ["src/app/(v2)", "src/app/login", "src/components/v2", "src/components/ds"];
const SEM_HEX = new Set(["src/app/globals.css", "src/components/ds/icones.generated.ts", "src/components/ds/simbolos.generated.ts"]);

const CORES = "neutral|gray|zinc|slate|stone|green|emerald|amber|yellow|red|rose|sky|blue|violet|purple|pink|orange";
const REGRAS = [
  ["import de lucide-react", /from\s+["']lucide-react["']/],
  ["classe dark:", /(?:^|[\s"'`{])dark:[\w[\]-]/],
  ["cor do Tailwind", new RegExp(`\\b(?:bg|text|border|ring|from|to)-(?:${CORES})-\\d{2,3}\\b`)],
  ["hex literal", /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![\w-])/, (arq) => !SEM_HEX.has(arq)],
  ["text-[10px]/[11px]", /text-\[1[01]px\]/],
  ["confirm()/alert()", /(?<![\w.])(?:window\.)?(?:confirm|alert)\(/],
  ["emoji", /\p{Extended_Pictographic}/u],
  ["monospace", /\bfont-mono\b|monospace/i],
];

/** Tira comentários da linha (// … e /* … *\/) para não acusar o que só está explicado em texto. */
const semComentario = (l) => /^\s*(?:\*|\/\*\*)/.test(l) ? "" : l.replace(/\/\*.*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/, "$1");

const arquivos = [];
const andar = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) andar(p);
    else if (/\.(tsx?|css)$/.test(n)) arquivos.push(p);
  }
};
for (const p of PASTAS) { try { andar(join(RAIZ, p)); } catch { /* pasta opcional */ } }

const problemas = [];
for (const abs of arquivos) {
  const arq = relative(RAIZ, abs).replaceAll("\\", "/");
  const linhas = readFileSync(abs, "utf-8").split(/\r?\n/);
  linhas.forEach((bruta, i) => {
    if (/ds-permitido/.test(linhas[i - 1] ?? "") || /ds-permitido/.test(bruta)) return;
    const l = semComentario(bruta);
    for (const [nome, re, vale] of REGRAS) {
      if (vale && !vale(arq)) continue;
      const m = l.match(re);
      if (m) problemas.push(`${arq}:${i + 1}  ${nome}  →  ${m[0].trim()}`);
    }
  });
}

if (problemas.length) {
  console.error(`Design system: ${problemas.length} problema(s) em ${arquivos.length} arquivos\n`);
  for (const p of problemas) console.error("  " + p);
  console.error("\nVeja docs/design-system/DESIGN-SYSTEM.md (regras globais e seção 13.3).");
  process.exit(1);
}
console.log(`Design system: ok (${arquivos.length} arquivos verificados)`);
