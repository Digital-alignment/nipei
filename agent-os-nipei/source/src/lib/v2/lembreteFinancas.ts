import fs from "fs";
import path from "path";
import { getEquipes, getLancamentos, getPessoas, vault, type Lancamento } from "./data";
import { semanaDe } from "./lembreteRevisao";
import { enviarWhatsApp } from "./whatsapp";

// Weekly WhatsApp to the gestão (Finanças is gestão only) with what is still "a pagar" / "a receber" (DS 10.25).
// Same pattern as lembreteRevisao: lazy from the v2 layout, Monday 08–20h (Bahia), once per week
// (<vault>/.jobs/lembrete-financas.json), production only, same filters as the other notices.
// Demo entries ("[TESTE]" in the description) never go out.

const ARQ = () => path.join(vault(), ".jobs", "lembrete-financas.json");
const LINK = "https://os.nipeihu.app/financas";
const MAX = 5;
let rodando = false;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v % 1 ? 2 : 0 });
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** The message (pure, testable); "" when nothing is pending. */
export function textoPendentes(lanc: Pick<Lancamento, "data" | "tipo" | "valor" | "descricao" | "categoria" | "evento" | "participante" | "anulado" | "pendente">[]) {
  const pend = lanc.filter((l) => l.pendente && !l.anulado && !/^\[TESTE\]/i.test(l.descricao)).sort((a, b) => a.data.localeCompare(b.data));
  const bloco = (tipo: "despesa" | "entrada", titulo: string) => {
    const ls = pend.filter((l) => l.tipo === tipo);
    if (!ls.length) return "";
    const linhas = ls.slice(0, MAX).map((l) => `• ${brl(l.valor)} — ${l.participante || l.descricao || l.categoria}${l.evento ? ` (${l.evento})` : ""} · ${dm(l.data)}`);
    if (ls.length > MAX) linhas.push(`• e mais ${ls.length - MAX}`);
    return `*${titulo}: ${brl(ls.reduce((a, l) => a + l.valor, 0))}*\n${linhas.join("\n")}`;
  };
  const partes = [bloco("despesa", "A pagar"), bloco("entrada", "A receber")].filter(Boolean);
  return partes.length ? `Finanças da semana\n\n${partes.join("\n\n")}\n\nMarque como pago/recebido em ${LINK}` : "";
}

export function lembreteFinancas() {
  if (rodando || process.env.NODE_ENV !== "production") return; // npm run dev has real Evolution keys: never send from there
  const agora = new Date().toLocaleString("sv-SE", { timeZone: "America/Bahia" });
  const hoje = agora.slice(0, 10), semana = semanaDe(hoje);
  if (hoje !== semana || agora.slice(11, 13) < "08" || agora.slice(11, 13) >= "20") return;
  let ultima = "";
  try { ultima = JSON.parse(fs.readFileSync(ARQ(), "utf-8")).semana ?? ""; } catch { /* first time */ }
  if (ultima >= semana) return;
  rodando = true;
  try {
    fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
    fs.writeFileSync(ARQ(), JSON.stringify({ semana, em: agora })); // before sending: never twice in a week
  } catch { rodando = false; return; }
  const texto = textoPendentes(getLancamentos());
  if (!texto) { rodando = false; return; }
  const gestao = new Set(getEquipes().filter((e) => e.gestao).map((e) => e.id));
  const pessoas = getPessoas().filter((p) => p.equipes.some((e) => gestao.has(e)) && p.whatsapp && p.whatsappVerificado && p.avisosWhatsapp && !p.suspenso && !p.externo && !p.contato);
  void Promise.all(pessoas.map((p) => enviarWhatsApp(p.whatsapp, `Oi, ${p.name.split(/[\s(]/)[0]}! ${texto}`).catch(() => false))).finally(() => { rodando = false; });
}

// self-check (pure part): npx tsx src/lib/v2/lembreteFinancas.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/lembreteFinancas.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const L = (tipo: "entrada" | "despesa", valor: number, descricao: string, pendente = true, extra: Partial<Lancamento> = {}) =>
    ({ data: "2026-10-20", tipo, valor, descricao, categoria: "Outras", evento: "", participante: "", anulado: false, pendente, ...extra });
  assert(textoPendentes([L("despesa", 10, "x", false)]) === "", "nada pendente = sem mensagem");
  assert(textoPendentes([L("despesa", 600, "[TESTE] facilitador")]) === "", "teste não sai");
  const t = textoPendentes([L("despesa", 600, "Facilitador", true, { evento: "Dieta outubro 2026" }), L("entrada", 600.5, "Saldo", true, { participante: "Maria" }), L("entrada", 1, "anulado", true, { anulado: true })]).replace(/\s/g, " ");
  assert(t.includes("*A pagar: R$ 600*") && t.includes("Facilitador (Dieta outubro 2026) · 20/10"), "a pagar com evento");
  assert(t.includes("*A receber: R$ 600,50*") && t.includes("Maria"), "a receber pelo participante, sem o anulado");
  const muitos = textoPendentes(Array.from({ length: 7 }, (_, i) => L("despesa", 1, `d${i}`)));
  assert(muitos.includes("e mais 2"), "corta em 5");
  console.log("lembreteFinancas: ok");
}
