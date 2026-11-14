// Fake ledger entries to exercise Finanças and Lynn's section 4 while there is no real data.
// Every entry has `teste: true`, "[TESTE]" in the description and a TESTE_ file name, so `limpar` removes all of them and nothing else.
//   node scripts/financas-teste.mjs carregar [vault]   → (re)writes the test entries
//   node scripts/financas-teste.mjs limpar   [vault]   → deletes every entry with teste: true
// vault: argv, VAULT_PATH, or ../../../nipei-vault. Same files on the VPS: VAULT_PATH=/opt/nipei-vault.
import fs from "node:fs";
import path from "node:path";

const [cmd, arg] = process.argv.slice(2);
const vault = arg || process.env.VAULT_PATH || path.resolve(import.meta.dirname, "../../../../nipei-vault");
const dir = path.join(vault, "Financeiro", "Lancamentos");

// [data, tipo, valor, categoria, descrição, projeto, evento, participante, pendente?]. Retreat 01–10/10/2026 (8 participants),
// dieta 12–31/10 (3); "santuario" is the diagnostic's project. One participant of each still owes part (a receber).
// A few entries have no event, no project or fall outside the period, to check those filters.
const S = "santuario", R = "Retiro outubro 2026", D = "Dieta outubro 2026";
const inscricoes = [
  ...Array.from({ length: 7 }, (_, i) => [`2026-09-${String(10 + i).padStart(2, "0")}`, "entrada", 2250, "Retiros e eventos", `Inscrição do retiro — Participante R${i + 1}`, S, R, `Participante R${i + 1}`]),
  ["2026-09-18", "entrada", 1650, "Retiros e eventos", "Inscrição do retiro — Participante R8 (sinal + parte)", S, R, "Participante R8"],
  ["2026-10-10", "entrada", 600, "Retiros e eventos", "Saldo da inscrição — Participante R8 (a receber)", S, R, "Participante R8", true],
  ["2026-10-11", "entrada", 2500, "Retiros e eventos", "Inscrição da dieta — Participante D1", S, D, "Participante D1"],
  ["2026-10-11", "entrada", 2500, "Retiros e eventos", "Inscrição da dieta — Participante D2", S, D, "Participante D2"],
  ["2026-10-12", "entrada", 1300, "Retiros e eventos", "Inscrição da dieta — Participante D3 (parte)", S, D, "Participante D3"],
  ["2026-10-30", "entrada", 1200, "Retiros e eventos", "Saldo da dieta — Participante D3 (a receber)", S, D, "Participante D3", true],
];
const DADOS = [
  ["2026-09-05", "despesa", 450, "Marketing e divulgação", "Anúncios Instagram do retiro (pré-venda)", S, R],
  ["2026-09-20", "despesa", 380, "Marketing e divulgação", "Design do material de divulgação", S, R],
  ["2026-09-28", "despesa", 1250, "Alimentação", "Compra grande de mantimentos para o retiro", S, R],
  ["2026-10-01", "despesa", 960, "Transporte e combustível", "Translado dos participantes rodoviária → santuário", S, R],
  ["2026-10-03", "despesa", 4800, "Serviços e honorários", "Cachê dos facilitadores do retiro", S, R],
  ["2026-10-05", "despesa", 1800, "Ajudas de custo / equipe", "Ajuda de custo dos guardiões (6 pessoas)", S, R],
  ["2026-10-06", "despesa", 870, "Alimentação", "Feira de frutas e verduras (semana 1)", S, R],
  ["2026-10-08", "despesa", 520, "Hospedagem e limpeza", "Lavanderia e limpeza dos quartos", S, R],
  ["2026-10-10", "despesa", 340, "Materiais e insumos", "Velas, lenha e materiais de cerimônia", S, R],
  ["2026-10-14", "despesa", 650, "Alimentação", "Alimentação específica da dieta", S, D],
  ["2026-10-18", "despesa", 1500, "Serviços e honorários", "Acompanhamento do facilitador da dieta", S, D],
  ["2026-10-20", "despesa", 280, "Transporte e combustível", "Combustível para compras na cidade", S, D],
  ["2026-10-31", "despesa", 600, "Serviços e honorários", "Segunda parcela do facilitador da dieta (a pagar)", S, D, "", true],
  ["2026-10-24", "despesa", 1100, "Manutenção e obras", "Conserto do telhado da maloca", ""],
  ["2026-10-31", "entrada", 900, "Vendas Inirau / loja", "Vendas da lojinha durante o retiro e a dieta", S],
  ["2026-11-20", "despesa", 300, "Impostos e taxas", "Taxas bancárias de novembro (fora do período)", ""],
  ...inscricoes,
];

const ehTeste = (f) => /^teste: true$/m.test(fs.readFileSync(path.join(dir, f), "utf-8").split(/\r?\n---/)[0]);
function limpar() {
  if (!fs.existsSync(dir)) return 0;
  const fs_ = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && ehTeste(f));
  // receipts attached in the app to test entries go too (Financeiro/Comprovantes/<id>.<ext>)
  const comp = path.join(dir, "..", "Comprovantes");
  const ids = fs_.map((f) => fs.readFileSync(path.join(dir, f), "utf-8").match(/^id: "?([^"\r\n]+)"?/m)?.[1]).filter(Boolean);
  if (fs.existsSync(comp)) for (const c of fs.readdirSync(comp)) if (ids.includes(c.replace(/\.[^.]+$/, ""))) fs.unlinkSync(path.join(comp, c));
  fs_.forEach((f) => fs.unlinkSync(path.join(dir, f)));
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  if (fs.existsSync(comp) && !fs.readdirSync(comp).length) fs.rmdirSync(comp);
  return fs_.length;
}
function carregar() {
  limpar();
  fs.mkdirSync(dir, { recursive: true });
  DADOS.forEach(([data, tipo, valor, categoria, desc, projeto, evento = "", participante = "", pendente = false], i) => {
    const id = `lanc_teste${String(i + 1).padStart(2, "0")}`;
    const descricao = `[TESTE] ${desc}`;
    const fm = { id, type: "lancamento", teste: true, data, tipo, valor, categoria, descricao, projeto, evento, participante, equipe: "", registrado_por: "teste", anulado: false, pendente, updated_at: new Date().toISOString() };
    const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`).join("\n");
    const nome = `TESTE_${data}_${id.slice(5)}.md`;
    fs.writeFileSync(path.join(dir, nome), `---\n${yaml}\n---\n\n<!-- agente: financas-teste (dados de teste, apagar com: node scripts/financas-teste.mjs limpar) -->\n# ${tipo === "entrada" ? "Entrada" : "Despesa"}: ${descricao}\n`);
  });
  return DADOS.length;
}

// The test period and budget were typed in the app (Diagnosticos/<id>/coletivo.md), so they carry no mark of their own:
// `limpar-diagnostico` empties `periodo` and `orcamento` of every diagnostic and prints what it removed.
function limparDiagnostico() {
  const base = path.join(vault, "Diagnosticos");
  if (!fs.existsSync(base)) return;
  for (const d of fs.readdirSync(base)) {
    const f = path.join(base, d, "coletivo.md");
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, "utf-8"), nl = s.includes("\r\n") ? "\r\n" : "\n";
    const bloco = (k) => new RegExp(`^${k}:.*(?:\\r?\\n  .*)*`, "m");
    const novo = s.replace(bloco("periodo"), `periodo:${nl}  de: ''${nl}  ate: ''`).replace(bloco("orcamento"), "orcamento: {}");
    if (novo === s) continue;
    console.log(`${d}: apagado\n${s.match(bloco("periodo"))?.[0] ?? ""}\n${s.match(bloco("orcamento"))?.[0] ?? ""}`);
    fs.writeFileSync(f, novo);
  }
}

if (cmd === "carregar") console.log(`${carregar()} lançamentos de teste em ${dir}`);
else if (cmd === "limpar") console.log(`${limpar()} lançamentos de teste apagados de ${dir}\n(período e orçamento do diagnóstico ficam: limpar-diagnostico)`);
else if (cmd === "limpar-diagnostico") limparDiagnostico();
else console.log("use: node scripts/financas-teste.mjs carregar|limpar|limpar-diagnostico [vault]");
