// Contraste WCAG dos pares texto/fundo do design system, lido dos tokens REAIS de src/app/globals.css
// (DESIGN-SYSTEM.md seções 3.2–3.5), nos dois temas. Uso: node scripts/ds-contraste.mjs (parte de npm run verificar:ds)
// → sai com código 1 se um par obrigatório ficar abaixo de 4,5:1 ou se o bloco "Sistema" divergir do claro.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf-8");
const bloco = (seletor) => {
  const i = css.indexOf(seletor + " {");
  if (i < 0) throw new Error(`bloco de tokens não encontrado: ${seletor}`);
  const corpo = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  return Object.fromEntries([...corpo.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
};
const TEMAS = {
  escuro: bloco('.v2, .v2 [data-tema="escuro"]'),
  claro: bloco('[data-tema="claro"] .v2, .v2 [data-tema="claro"]'),
};
const sistema = bloco(":root:not([data-tema]) .v2");

const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// [texto, fundo, mínimo | null = o documento diz "não usar" (só informa)]
const EQUIPES = ["eq-escritorio", "eq-producao", "eq-guardioes", "eq-manutencao"];
const PARES = [
  // 3.5 — texto sobre as superfícies
  ...["t1", "t2", "t3"].flatMap((t) => ["bg", "s1", "s2"].map((f) => [t, f, 4.5])),
  ["t1", "s3", 4.5], ["t2", "s3", 4.5], ["t3", "s3", null],
  // 3.2 — acento e destaque
  ["ac-ink", "ac", 4.5], ["ac-text", "bg", 4.5], ["ac-text", "s1", 4.5], ["ac-text", "ac-soft", 4.5], ["destaque-ink", "destaque-bg", 4.5],
  // 3.3 — estados sobre o próprio fundo e sobre a página
  ...["ok", "warn", "err", "info"].flatMap((e) => [[e, `${e}-bg`, 4.5], [e, "bg", 4.5]]),
  // 3.4 — equipes como texto sobre a página
  ...EQUIPES.map((e) => [e, "bg", 4.5]),
];

let falhas = 0;
for (const [tema, tk] of Object.entries(TEMAS)) {
  console.log(`\n${tema}`);
  for (const [t, f, min] of PARES) {
    if (!tk[t] || !tk[f]) { console.log(`  ✗ token ausente: --${tk[t] ? f : t}`); falhas++; continue; }
    const r = razao(tk[t], tk[f]);
    const ok = min == null || r >= min;
    if (!ok) falhas++;
    console.log(`  ${min == null ? "·" : ok ? "✓" : "✗"} ${t.padEnd(12)} sobre ${f.padEnd(11)} ${r.toFixed(2).padStart(5)}:1${min == null ? "  (não usar)" : ok ? "" : `  < ${min}`}`);
  }
}
// "Sistema" com o aparelho no claro repete os valores do claro: os dois blocos não podem divergir
const diverge = Object.keys(TEMAS.claro).filter((k) => sistema[k] !== TEMAS.claro[k]);
if (diverge.length) { console.log(`\n✗ o bloco "Sistema" (prefers-color-scheme: light) difere do claro em: ${diverge.join(", ")}`); falhas++; }

console.log(falhas ? `\n${falhas} problema(s) de contraste` : "\nContraste: ok nos dois temas");
process.exit(falhas ? 1 : 0);
