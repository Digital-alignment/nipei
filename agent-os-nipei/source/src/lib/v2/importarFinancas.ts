import fs from "node:fs";
import path from "node:path";
import { CATEGORIAS, getLancamentos, vault, type Lancamento } from "./data";

// Finanças → "Importar planilha" (DS 10.25): reads a CSV/TSV exported from Sheets, Excel or a bank statement,
// shows a preview, and only then writes the entries. The preview lives in <vault>/.jobs/importacoes/<pessoa>.json
// (one per person, outside git): the confirm action imports what the SERVER parsed, never rows sent by the browser.

export type LinhaImport = {
  linha: number; data: string; tipo: "entrada" | "despesa"; valor: number; categoria: string; descricao: string;
  evento: string; participante: string; pendente: boolean; avisos: string[]; erro: string; repetido: boolean;
};
export type Previa = { id: string; arquivo: string; em: string; linhas: LinhaImport[] };

export const MAX_LINHAS = 1000;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036F]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Money typed in pt-BR: "1.234,56", "R$ 25.000" (dots = thousands), "1234.56", "-50", "(50,00)". NaN when it is not a number. */
export function numBR(v: string): number {
  v = v.replace(/\s|R\$/gi, "");
  const neg = /^\(.*\)$/.test(v) || /^-/.test(v) || /-$/.test(v);
  v = v.replace(/[()]/g, "").replace(/^-|-$/g, "");
  const n = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, "") : v);
  return v === "" ? NaN : neg ? -n : n;
}

/** yyyy-mm-dd, dd/mm/yyyy, dd/mm/yy, dd-mm-yyyy, dd.mm.yyyy → yyyy-mm-dd ("" when not a real date). */
export function dataISO(v: string): string {
  v = v.trim().slice(0, 10);
  let y: number, m: number, d: number;
  let r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) [d, m, y] = [+r[1], +r[2], r[3].length === 2 ? 2000 + +r[3] : +r[3]];
  else return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : "";
}

/** CSV with quotes ("" = a quote, newlines inside quotes); the separator is the most frequent of ; tab , in the header line. */
export function dividir(texto: string): string[][] {
  texto = texto.replace(/^\uFEFF/, "");
  const cab = texto.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((c) => [c, cab.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

// header aliases (accent- and case-insensitive)
const COLUNAS: Record<string, string[]> = {
  data: ["data", "date", "dia", "data do lancamento", "data lancamento", "data de pagamento", "vencimento"],
  tipo: ["tipo", "type", "natureza", "entrada/saida", "entrada ou despesa"],
  valor: ["valor", "value", "amount", "montante", "quantia", "valor (r$)", "valor r$", "total"],
  credito: ["credito", "credito (r$)", "entradas", "receita", "receitas", "recebido"],
  debito: ["debito", "debito (r$)", "saidas", "saida", "despesas", "gasto", "gastos", "pago"],
  categoria: ["categoria", "category", "classificacao", "conta"],
  descricao: ["descricao", "description", "historico", "detalhe", "detalhes", "memo", "lancamento", "item"],
  evento: ["evento", "event", "retiro", "dieta"],
  participante: ["participante", "participant", "nome", "cliente", "pagador", "hospede"],
  situacao: ["situacao", "status", "estado"],
};
const ENTRADA = /^(entrada|receita|credito|recebimento|in|income|\+)/, DESPESA = /^(despesa|saida|debito|gasto|pagamento|out|expense|-)/;
const PENDENTE = /^(a pagar|a receber|pendente|aberto|em aberto|nao pago|nao recebido|pending|open)/;

function categoriaDe(bruta: string, tipo: "entrada" | "despesa"): { categoria: string; aviso: string } {
  const lista = CATEGORIAS[tipo] as readonly string[], outra = lista[lista.length - 1];
  const b = norm(bruta);
  if (!b) return { categoria: outra, aviso: "" };
  const achou = lista.find((c) => norm(c) === b) ?? lista.find((c) => norm(c).startsWith(b) || b.startsWith(norm(c).split(" ")[0]));
  return achou ? { categoria: achou, aviso: "" } : { categoria: outra, aviso: `categoria "${bruta}" → ${outra}` };
}

/** Pure: text of the file → preview rows (existing entries only mark repetitions). */
export function lerPlanilha(texto: string, existentes: Pick<Lancamento, "data" | "tipo" | "valor" | "descricao" | "anulado">[] = []): { linhas: LinhaImport[]; erro: string } {
  const todas = dividir(texto);
  if (todas.length < 2) return { linhas: [], erro: "A planilha precisa de uma linha de cabeçalho e pelo menos um lançamento." };
  if (todas.length - 1 > MAX_LINHAS) return { linhas: [], erro: `Máximo de ${MAX_LINHAS} linhas por importação.` };
  const cab = todas[0].map(norm);
  const col = Object.fromEntries(Object.entries(COLUNAS).map(([k, al]) => [k, cab.findIndex((h) => al.includes(h))])) as Record<string, number>;
  if (col.data < 0) return { linhas: [], erro: 'Falta a coluna "data".' };
  if (col.valor < 0 && col.credito < 0 && col.debito < 0) return { linhas: [], erro: 'Falta a coluna "valor" (ou "crédito"/"débito").' };
  const chave = (l: { data: string; tipo: string; valor: number; descricao: string }) => `${l.data}|${l.tipo}|${l.valor.toFixed(2)}|${norm(l.descricao.replace(/^\[teste\]\s*/i, ""))}`;
  const ja = new Set(existentes.filter((l) => !l.anulado).map(chave));
  const linhas = todas.slice(1).map((r, i): LinhaImport => {
    const v = (k: string) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");
    const avisos: string[] = [];
    let erro = "";
    const data = dataISO(v("data"));
    if (!data) erro = `data "${v("data")}" ilegível`;
    // value + type: explicit type column, else credit/debit columns, else the sign
    let valor = NaN, tipo: "entrada" | "despesa" = "entrada";
    if (col.valor >= 0 && v("valor")) valor = numBR(v("valor"));
    else if (v("credito") && numBR(v("credito"))) { valor = Math.abs(numBR(v("credito"))); tipo = "entrada"; }
    else if (v("debito") && numBR(v("debito"))) { valor = -Math.abs(numBR(v("debito"))); tipo = "despesa"; }
    const t = norm(v("tipo"));
    if (ENTRADA.test(t)) tipo = "entrada";
    else if (DESPESA.test(t)) tipo = "despesa";
    else if (!Number.isNaN(valor)) {
      tipo = valor < 0 ? "despesa" : "entrada";
      if (col.tipo < 0 && col.credito < 0 && col.debito < 0 && valor > 0) avisos.push("sem tipo: lido como entrada");
    }
    if (!(Math.abs(valor) > 0)) erro ||= `valor "${v("valor") || v("credito") || v("debito")}" ilegível`;
    valor = Math.round(Math.abs(valor) * 100) / 100;
    const { categoria, aviso } = categoriaDe(v("categoria"), tipo);
    if (aviso) avisos.push(aviso);
    const descricao = v("descricao").replace(/\s+/g, " ").slice(0, 200);
    const linha = { linha: i + 2, data, tipo, valor: Number.isFinite(valor) ? valor : 0, categoria, descricao,
      evento: v("evento").replace(/\s+/g, " ").slice(0, 80), participante: v("participante").replace(/\s+/g, " ").slice(0, 80),
      pendente: PENDENTE.test(norm(v("situacao"))), avisos, erro, repetido: false };
    linha.repetido = !erro && ja.has(chave(linha));
    return linha;
  });
  return { linhas, erro: "" };
}

const arquivoPrevia = (pessoa: string) => path.join(vault(), ".jobs", "importacoes", `${pessoa.replace(/[^\w-]/g, "")}.json`);

export function salvarPrevia(pessoa: string, arquivo: string, texto: string): { erro: string } {
  const r = lerPlanilha(texto, getLancamentos());
  if (r.erro) return { erro: r.erro };
  const p: Previa = { id: `imp_${Date.now().toString(36)}`, arquivo: arquivo.slice(0, 120), em: new Date().toISOString(), linhas: r.linhas };
  fs.mkdirSync(path.dirname(arquivoPrevia(pessoa)), { recursive: true });
  fs.writeFileSync(arquivoPrevia(pessoa), JSON.stringify(p));
  return { erro: "" };
}
export function getPrevia(pessoa: string): Previa | null {
  try { return JSON.parse(fs.readFileSync(arquivoPrevia(pessoa), "utf-8")) as Previa; } catch { return null; }
}
export function apagarPrevia(pessoa: string) { fs.rmSync(arquivoPrevia(pessoa), { force: true }); }

export const importaveis = (p: Previa) => p.linhas.filter((l) => !l.erro && !l.repetido);
/** When an import happened, from its id (imp_<base36 ms>). */
export const quandoImportacao = (id: string) => new Date(parseInt(id.slice(4), 36) || 0).toISOString();

export const MODELO = [
  "data;tipo;valor;categoria;descricao;evento;participante;situacao",
  "01/10/2026;entrada;2.250,00;Retiros e eventos;Inscrição do retiro;Retiro outubro 2026;Nome da pessoa;pago",
  "03/10/2026;despesa;4.800,00;Serviços e honorários;Cachê dos facilitadores;Retiro outubro 2026;;pago",
  "30/10/2026;entrada;1.200,00;Retiros e eventos;Saldo da dieta;Dieta outubro 2026;Nome da pessoa;a receber",
].join("\r\n") + "\r\n";

// self-check: VAULT_PATH=<vault> npx tsx src/lib/v2/importarFinancas.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/importarFinancas.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  for (const [i, o] of [["25.000", 25000], ["R$ 1.234,56", 1234.56], ["1234.56", 1234.56], ["-50", -50], ["(1.000,00)", -1000], ["600", 600]] as const) assert(numBR(i) === o, `numBR ${i}`);
  assert(Number.isNaN(numBR("abc")) && Number.isNaN(numBR("")), "numBR inválido");
  assert(dataISO("01/10/2026") === "2026-10-01" && dataISO("2026-10-01") === "2026-10-01" && dataISO("5/3/26") === "2026-03-05", "datas");
  assert(dataISO("31/02/2026") === "" && dataISO("ontem") === "", "data impossível");
  assert(dividir('a;b\n"x;y";"di ""z"""\n').join("|") === "a,b|x;y,di \"z\"", "aspas");
  assert(dividir("a,b\n1,2").length === 2 && dividir("a\tb\n1\t2")[1][1] === "2", "separadores");
  const r = lerPlanilha([
    "Data;Descrição;Valor;Categoria;Situação;Evento",
    "01/10/2026;Inscrição;2.250,00;retiros;pago;Retiro",
    "02/10/2026;Feira;-870,50;Alimentação;;Retiro",
    "03/10/2026;Algo;100;Xyz;a pagar;",
    "dia 4;Ruim;10;;;",
    "05/10/2026;Igual;300;;;",
  ].join("\n"), [{ data: "2026-10-05", tipo: "entrada", valor: 300, descricao: "[TESTE] igual", anulado: false }]);
  const [a, b, c, d, e] = r.linhas;
  assert(a.tipo === "entrada" && a.valor === 2250 && a.categoria === "Retiros e eventos" && a.evento === "Retiro", "linha entrada");
  assert(b.tipo === "despesa" && b.valor === 870.5 && b.categoria === "Alimentação", "sinal negativo = despesa");
  assert(c.pendente && c.categoria === "Outras entradas" && c.avisos.length === 2, "categoria desconhecida + sem tipo + pendente");
  assert(!!d.erro && d.linha === 5, "data ilegível = erro com nº da linha");
  assert(e.repetido, "igual a um existente = repetido");
  const ext = lerPlanilha("Data;Histórico;Crédito;Débito\n01/10/2026;PIX recebido;500,00;\n02/10/2026;Tarifa;;12,90").linhas;
  assert(ext[0].tipo === "entrada" && ext[0].valor === 500 && ext[1].tipo === "despesa" && ext[1].valor === 12.9 && !ext[0].avisos.length, "extrato crédito/débito");
  assert(lerPlanilha("descricao;valor\nx;1").erro.includes("data"), "sem coluna data");
  assert(lerPlanilha(MODELO).linhas.every((l) => !l.erro && !l.avisos.length), "o modelo importa sem avisos");
  console.log(`importarFinancas: ${ok} ok`);
}
