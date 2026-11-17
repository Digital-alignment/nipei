// "Para materiais" (phase 3 of the brain for generating): a public Google Drive folder with the brand (logo,
// brand guide Doc) and approved photos in subfolders by topic. Public by link, so it is listed without any Google
// account: the folder's embedded view lists names and ids. The file NAME is the photo's description for the AI.
// Folder: NIPEI_MATERIAIS_PASTA (id) or the default below. ponytail: 10-min in-memory cache, one level of subfolders.

import { palavras } from "./conhecimento";

const PASTA_PADRAO = "14OTVpMCSHTC38rmILxIWgiP8LYfFZrly"; // "Nipëi · Para materiais" (created 2026-11-16)
export const pastaMateriais = () => process.env.NIPEI_MATERIAIS_PASTA || PASTA_PADRAO;

export type Item = { id: string; nome: string; tipo: "pasta" | "doc" | "arquivo"; link: string };
export type Pasta = { nome: string; link: string; itens: Item[] };
export type Materiais = { link: string; marca: Pasta | null; guia: string; temas: Pasta[] };

/** Entries of Drive's embedded folder view. Pure. */
export function lerPasta(html: string): Item[] {
  const out: Item[] = [];
  for (const [, href, nome] of html.matchAll(/<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g)) {
    const pasta = href.match(/\/drive\/folders\/([\w-]+)/), doc = href.match(/docs\.google\.com\/document\/d\/([\w-]+)/), arq = href.match(/\/(?:file|presentation|spreadsheets|document)\/d\/([\w-]+)/);
    const id = pasta?.[1] ?? doc?.[1] ?? arq?.[1];
    if (!id) continue;
    out.push({ id, nome: nome.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(), tipo: pasta ? "pasta" : doc ? "doc" : "arquivo", link: href.replace(/&amp;/g, "&") });
  }
  return out;
}

const listar = async (id: string): Promise<Item[]> => {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return lerPasta(await r.text());
};
const MARCA_SECAO = /fundament|tipogra|typograph|cor(es)?\b|color|paleta|palette|tom\b|tono|tone|voz|voice|logo|marca|brand|regra|regla|rule/i;
/** A long guide (e.g. a site's DESIGN.md) keeps only its brand sections (headings about type, color, tone, logo…). Pure. */
export function resumirGuia(txt: string, max = 8000): string {
  const t = txt.replace(/^﻿/, "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length <= max) return t;
  const secoes = t.split(/\n(?=#{1,3} )/);
  const uteis = secoes.filter((s) => MARCA_SECAO.test(s.split("\n")[0]));
  return (uteis.length ? uteis.join("\n\n") : t).slice(0, max);
}
const textoDoc = async (id: string) => {
  const r = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`, { signal: AbortSignal.timeout(10_000) });
  return r.ok ? resumirGuia(await r.text()) : "";
};

let cache: { em: number; pasta: string; m: Materiais } | null = null;
export async function getMateriais(): Promise<Materiais | null> {
  const id = pastaMateriais();
  if (cache && cache.pasta === id && Date.now() - cache.em < 600_000) return cache.m;
  try {
    const raiz = await listar(id);
    const pastas = await Promise.all(raiz.filter((x) => x.tipo === "pasta").map(async (p) => ({ nome: p.nome, link: p.link, itens: await listar(p.id).catch(() => []) })));
    const marca = pastas.find((p) => /^marca$/i.test(p.nome.trim())) ?? null;
    const guiaDoc = marca?.itens.find((x) => x.tipo === "doc");
    const m: Materiais = { link: `https://drive.google.com/drive/folders/${id}`, marca, guia: guiaDoc ? await textoDoc(guiaDoc.id).catch(() => "") : "", temas: pastas.filter((p) => p !== marca) };
    cache = { em: Date.now(), pasta: id, m };
    return m;
  } catch (e) {
    console.warn("[materiais]", (e as Error).message);
    return null;
  }
}

/** Direct image address (works for files shared by link); the view link is kept for anything else. */
export const imagemDireta = (it: Item) => `https://lh3.googleusercontent.com/d/${it.id}`;
const ehImagem = (nome: string) => /\.(jpe?g|png|webp|gif|heic|svg)$/i.test(nome);

/** Markdown section for the dossier: brand guide, brand files and the photos of the matching topic folders. */
export function secaoMateriais(m: Materiais | null, tema: string, geral: boolean): string {
  if (!m) return "";
  const alvo = palavras(tema);
  const temas = geral ? m.temas : m.temas.filter((p) => [...palavras(p.nome)].some((w) => alvo.has(w)));
  const usados = temas.length ? temas : m.temas; // no folder matches the topic: offer all, the AI picks
  const arq = (it: Item) => ehImagem(it.nome) ? `- ${it.nome}: ${imagemDireta(it)} (abrir: ${it.link})` : `- ${it.nome}: ${it.link}`;
  const partes = [`## Marca e fotos (pasta "Para materiais": ${m.link})`,
    "O nome de cada arquivo descreve a foto. Use só estas imagens; para inserir, use o endereço direto (lh3…); se o app não inserir imagens por endereço, diga qual foto vai em cada parte."];
  if (m.guia) partes.push(`### Guia de marca\n${m.guia}`);
  const marcaArq = m.marca?.itens.filter((x) => x.tipo !== "pasta" && x.tipo !== "doc") ?? [];
  if (marcaArq.length) partes.push(`### Arquivos da marca\n${marcaArq.map(arq).join("\n")}`);
  if (!m.guia && !marcaArq.length) partes.push("### Marca\n(ainda vazia: sem guia nem logo; não invente cores nem logo)");
  const fotos = usados.map((p) => { const fs = p.itens.filter((x) => x.tipo === "arquivo").slice(0, 30); return fs.length ? `### Fotos: ${p.nome}\n${fs.map(arq).join("\n")}` : ""; }).filter(Boolean);
  partes.push(fotos.length ? fotos.join("\n\n") : "### Fotos\n(nenhuma foto ainda nas pastas deste tema)");
  return partes.join("\n\n");
}

// self-check: npx tsx src/lib/v2/materiais.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/materiais.ts")) {
  const html = `<div class="flip-entry" id="entry-A"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/PASTA1" target="_blank"><div class="flip-entry-title">Ini Rau</div></a></div></div>
<div class="flip-entry"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/FOTO_1/view?usp=drive_web&amp;x=1" target="_blank"><div class="x"></div><div class="flip-entry-title">mini-aldeia-vista.jpg</div></a></div></div>
<div class="flip-entry"><div class="flip-entry-info"><a href="https://docs.google.com/document/d/DOC-9/edit?usp=drive_web" target="_blank"><div class="flip-entry-title">Guia de marca</div></a></div></div>`;
  const it = lerPasta(html);
  if (it.length !== 3 || it[0].tipo !== "pasta" || it[0].id !== "PASTA1" || it[1].tipo !== "arquivo" || it[1].id !== "FOTO_1" || !it[1].link.includes("&x=1") || it[2].tipo !== "doc" || it[2].id !== "DOC-9") throw new Error(JSON.stringify(it));
  const m: Materiais = { link: "L", marca: { nome: "Marca", link: "", itens: [{ id: "LOGO", nome: "logo.png", tipo: "arquivo", link: "v" }] }, guia: "", temas: [{ nome: "Ini Rau", link: "", itens: [it[1]] }, { nome: "Pessoas", link: "", itens: [] }] };
  const s = secaoMateriais(m, "Inî Rau", false);
  if (!s.includes("lh3.googleusercontent.com/d/FOTO_1") || !s.includes("lh3.googleusercontent.com/d/LOGO") || s.includes("Fotos: Pessoas")) throw new Error(s);
  getMateriais().then((x) => { console.log("pasta real:", x ? `${x.temas.map((p) => `${p.nome}(${p.itens.length})`).join(", ")}; marca ${x.marca ? x.marca.itens.length : "-"} itens` : "inacessível"); console.log("materiais: ok"); });
}
