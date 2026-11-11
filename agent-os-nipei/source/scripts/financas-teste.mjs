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

// [data, tipo, valor, categoria, descrição, projeto, pendente?]. Retreat 01–10/10/2026, dieta 12–31/10; "santuario" is the diagnostic's project.
// A few entries fall outside the period or have no project, to check the period filter.
const S = "santuario";
const DADOS = [
  ["2026-09-05", "despesa", 450, "Marketing e divulgação", "Anúncios Instagram do retiro (pré-venda)", S],
  ["2026-09-12", "entrada", 3600, "Retiros e eventos", "Sinal de inscrições do retiro (6 × R$ 600)", S],
  ["2026-09-20", "despesa", 380, "Marketing e divulgação", "Design do material de divulgação", S],
  ["2026-09-28", "despesa", 1250, "Alimentação", "Compra grande de mantimentos para o retiro", S],
  ["2026-10-01", "entrada", 14400, "Retiros e eventos", "Saldo das inscrições do retiro (8 participantes)", S],
  ["2026-10-01", "despesa", 960, "Transporte e combustível", "Translado dos participantes rodoviária → santuário", S],
  ["2026-10-03", "despesa", 4800, "Serviços e honorários", "Cachê dos facilitadores do retiro", S],
  ["2026-10-05", "despesa", 1800, "Ajudas de custo / equipe", "Ajuda de custo dos guardiões (6 pessoas)", S],
  ["2026-10-06", "despesa", 870, "Alimentação", "Feira de frutas e verduras (semana 1)", S],
  ["2026-10-08", "despesa", 520, "Hospedagem e limpeza", "Lavanderia e limpeza dos quartos", S],
  ["2026-10-10", "despesa", 340, "Materiais e insumos", "Velas, lenha e materiais de cerimônia", S],
  ["2026-10-12", "entrada", 7500, "Retiros e eventos", "Inscrições da dieta (3 participantes)", S],
  ["2026-10-14", "despesa", 650, "Alimentação", "Alimentação específica da dieta", S],
  ["2026-10-18", "despesa", 1500, "Serviços e honorários", "Acompanhamento do facilitador da dieta", S],
  ["2026-10-20", "despesa", 280, "Transporte e combustível", "Combustível para compras na cidade", S],
  ["2026-10-24", "despesa", 1100, "Manutenção e obras", "Conserto do telhado da maloca", ""],
  ["2026-10-31", "entrada", 900, "Vendas Inirau / loja", "Vendas da lojinha durante o retiro e a dieta", S],
  ["2026-10-30", "entrada", 1200, "Retiros e eventos", "Saldo de 1 participante da dieta (a receber)", S, true],
  ["2026-10-31", "despesa", 600, "Serviços e honorários", "Segunda parcela do facilitador da dieta (a pagar)", S, true],
  ["2026-11-20", "despesa", 300, "Impostos e taxas", "Taxas bancárias de novembro (fora do período)", ""],
];

const ehTeste = (f) => /^teste: true$/m.test(fs.readFileSync(path.join(dir, f), "utf-8").split(/\r?\n---/)[0]);
function limpar() {
  if (!fs.existsSync(dir)) return 0;
  const fs_ = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && ehTeste(f));
  fs_.forEach((f) => fs.unlinkSync(path.join(dir, f)));
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  return fs_.length;
}
function carregar() {
  limpar();
  fs.mkdirSync(dir, { recursive: true });
  DADOS.forEach(([data, tipo, valor, categoria, desc, projeto, pendente = false], i) => {
    const id = `lanc_teste${String(i + 1).padStart(2, "0")}`;
    const descricao = `[TESTE] ${desc}`;
    const fm = { id, type: "lancamento", teste: true, data, tipo, valor, categoria, descricao, projeto, equipe: "", registrado_por: "teste", anulado: false, pendente, updated_at: new Date().toISOString() };
    const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`).join("\n");
    const nome = `TESTE_${data}_${id.slice(5)}.md`;
    fs.writeFileSync(path.join(dir, nome), `---\n${yaml}\n---\n\n<!-- agente: financas-teste (dados de teste, apagar com: node scripts/financas-teste.mjs limpar) -->\n# ${tipo === "entrada" ? "Entrada" : "Despesa"}: ${descricao}\n`);
  });
  return DADOS.length;
}

if (cmd === "carregar") console.log(`${carregar()} lançamentos de teste em ${dir}`);
else if (cmd === "limpar") console.log(`${limpar()} lançamentos de teste apagados de ${dir}`);
else console.log("use: node scripts/financas-teste.mjs carregar|limpar [vault]");
