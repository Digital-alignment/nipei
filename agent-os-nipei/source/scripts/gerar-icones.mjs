// Gera os mapas de ícones a partir dos SVGs do design system (DESIGN-SYSTEM.md seção 7, ICONES.md).
// Uso: npm run icones   (depois de adicionar ou trocar um SVG em design-assets/icones/)
//
//   funcionais/*.svg  → src/components/ds/icones.generated.ts   (ICONES, usado por <Icone>)
//   simbolos*/*.svg   → src/components/ds/simbolos.generated.ts (SIMBOLOS, usado por <Selo>)
//
// Dois arquivos de propósito: os símbolos somam ~270 KB e não devem entrar no pacote de toda
// tela que só usa ícones funcionais. De cada SVG fica só o viewBox e o(s) `d` (sem <metadata>,
// c2pa, xmlns, fill). Os símbolos sagrados de outros povos do lote 2 nunca entram (seção 7.5).
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONES = join(RAIZ, "design-assets", "icones");
const SAIDA = join(RAIZ, "src", "components", "ds");

// lote 2: chakana, pássaro-trovão, hamsá, vaso cerimonial, porta — nunca usar
const PROIBIDOS = new Set(["08", "11", "15", "18", "20", "21", "22", "38", "41", "42"].map((n) => `simbolo2-${n}`));

function ler(arquivo) {
  const svg = readFileSync(arquivo, "utf-8");
  const viewBox = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)?.[1];
  const ds = [...svg.replace(/<metadata[\s\S]*?<\/metadata>/g, "").matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
  if (!viewBox || !ds.length) throw new Error(`SVG sem viewBox ou <path d>: ${arquivo}`);
  return { viewBox, d: ds.join(" ") };
}

/** Só os .svg da própria pasta (as subpastas "original/" ficam de fora). */
const svgs = (pasta) => readdirSync(pasta).filter((f) => f.endsWith(".svg") && statSync(join(pasta, f)).isFile()).sort();

function escrever(nomeArquivo, constante, tipo, mapa, comentario) {
  const linhas = Object.entries(mapa).map(([nome, v]) => `  ${JSON.stringify(nome)}: { viewBox: ${JSON.stringify(v.viewBox)}, d: ${JSON.stringify(v.d)} },`);
  const ts = `// GERADO por scripts/gerar-icones.mjs — não edite à mão (rode \`npm run icones\`).
// ${comentario}
export const ${constante} = {
${linhas.join("\n")}
} as const satisfies Record<string, { viewBox: string; d: string }>;

export type ${tipo} = keyof typeof ${constante};
`;
  writeFileSync(join(SAIDA, nomeArquivo), ts, "utf-8");
  return linhas.length;
}

const funcionais = {};
for (const f of svgs(join(ICONES, "funcionais"))) funcionais[f.slice(0, -4)] = ler(join(ICONES, "funcionais", f));

const simbolos = {};
const bloqueados = [];
for (const pasta of ["simbolos", "simbolos-2", "simbolos-3"]) {
  for (const f of svgs(join(ICONES, pasta))) {
    const nome = f.slice(0, -4);
    if (PROIBIDOS.has(nome)) { bloqueados.push(nome); continue; }
    simbolos[nome] = ler(join(ICONES, pasta, f));
  }
}

const nI = escrever("icones.generated.ts", "ICONES", "NomeIcone", funcionais, "Ícones funcionais (24×24, um path, fill=currentColor).");
const nS = escrever("simbolos.generated.ts", "SIMBOLOS", "ArquivoSimbolo", simbolos, "Selos: lotes 1 (simbolo-NN), 2 (simbolo2-NN) e 3 (simbolo3-NN), sem os proibidos do lote 2.");
console.log(`ícones: ${nI} · símbolos: ${nS} · bloqueados: ${bloqueados.join(", ") || "nenhum"}`);
