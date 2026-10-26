// Contraste WCAG dos pares texto/fundo do design system (DESIGN-SYSTEM.md seções 3.3–3.5).
// Uso: node scripts/ds-contraste.mjs   → sai com código 1 se um par que deve passar não passa.
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// [descrição, texto, fundo, mínimo exigido | null quando o documento diz "não usar"]
const PARES = [
  // 3.5 — referência
  ["Escuro t1 sobre s1", "#FFFFFF", "#141414", 4.5],
  ["Escuro t2 sobre s1", "#B3B3B3", "#141414", 4.5],
  ["Escuro t3 sobre s1", "#858585", "#141414", 4.5],
  ["Escuro t3 sobre s3 (não usar)", "#858585", "#303030", null],
  ["Claro t1 sobre bg", "#1A1A1A", "#FFFFFF", 4.5],
  ["Claro t2 sobre bg", "#424242", "#FFFFFF", 4.5],
  ["Claro t3 sobre bg", "#6B6B6B", "#FFFFFF", 4.5],
  ["Claro t3 sobre s1", "#6B6B6B", "#F5F5F5", 4.5],
  ["Claro t3 sobre s2", "#6B6B6B", "#EDEDED", 4.5],
  ["Claro t3 sobre s3 (nunca)", "#6B6B6B", "#DEDEDE", null],
  // 3.2 — acento
  ["Escuro ac-ink sobre ac", "#0A0A0A", "#C3D14A", 4.5],
  ["Claro ac-ink sobre ac", "#FFFFFF", "#2A5C0B", 4.5],
  ["Escuro ac-text sobre bg", "#C3D14A", "#0A0A0A", 4.5],
  ["Claro ac-text sobre bg", "#2A5C0B", "#FFFFFF", 4.5],
  // 3.3 — estados (texto sobre o próprio fundo)
  ["Escuro ok", "#C3D14A", "#1B2410", 4.5], ["Escuro warn", "#E0A526", "#2A2010", 4.5],
  ["Escuro err", "#FF6B5E", "#2C1514", 4.5], ["Escuro info", "#6FA8F0", "#121D2B", 4.5],
  ["Claro ok", "#2A5C0B", "#EEF3E8", 4.5], ["Claro warn", "#8A5A00", "#FBF3E4", 4.5],
  ["Claro err", "#B3261E", "#FBEAE9", 4.5], ["Claro info", "#1F5FAD", "#E9F0F9", 4.5],
  // 3.4 — equipes como texto sobre o fundo do tema
  ["Escuro eq-escritorio", "#2BB3A6", "#0A0A0A", 4.5], ["Escuro eq-producao", "#A68CF0", "#0A0A0A", 4.5],
  ["Escuro eq-guardioes", "#E37AB0", "#0A0A0A", 4.5], ["Escuro eq-manutencao", "#8FA6B8", "#0A0A0A", 4.5],
  ["Claro eq-escritorio", "#0F766E", "#FFFFFF", 4.5], ["Claro eq-producao", "#6D4AB8", "#FFFFFF", 4.5],
  ["Claro eq-guardioes", "#A3306B", "#FFFFFF", 4.5], ["Claro eq-manutencao", "#4F6475", "#FFFFFF", 4.5],
];

let falhas = 0;
for (const [nome, t, f, min] of PARES) {
  const r = razao(t, f);
  const st = min == null ? (r < 4.5 ? "evitar ✓" : "passa (doc diz evitar)") : r >= min ? "ok" : "FALHA";
  if (st === "FALHA") falhas++;
  console.log(`${st.padEnd(22)} ${r.toFixed(2).padStart(5)}:1  ${nome}  (${t} / ${f})`);
}
console.log(falhas ? `\n${falhas} par(es) abaixo do mínimo.` : "\nTodos os pares exigidos passam.");
process.exit(falhas ? 1 : 0);
