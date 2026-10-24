import fs from "fs";
import path from "path";
import { getPessoas, vault } from "./data";
import { checarTudo, type Estado } from "./saude";
import { enviarWhatsApp } from "./whatsapp";

// Health alerts on the admins' WhatsApp: every 10 minutes (lazily, from the v2 layout) the health checks run;
// a check that turns "erro" — or comes back from it — sends ONE message. No repeats while it stays the same.
// If the WhatsApp number itself is the thing that's down, the alert can't go out (the panel still shows it).

const ARQ = (n: string) => path.join(vault(), ".jobs", "admin", n);
const lerJson = <X,>(n: string, padrao: X): X => { try { return JSON.parse(fs.readFileSync(ARQ(n), "utf-8")); } catch { return padrao; } };
const gravar = (n: string, v: unknown) => { fs.mkdirSync(path.dirname(ARQ(n)), { recursive: true }); fs.writeFileSync(ARQ(n), JSON.stringify(v), { mode: 0o600 }); };

export const alertasLigados = () => lerJson<{ alertas?: boolean }>("config.json", {}).alertas !== false;
export function ligarAlertas(on: boolean) { gravar("config.json", { ...lerJson("config.json", {}), alertas: on }); }
export const alertasEnviados = (max = 20): { em: string; texto: string; ok: boolean }[] => {
  try { return fs.readFileSync(ARQ("alertas.jsonl"), "utf-8").trim().split("\n").filter(Boolean).slice(-max).reverse().map((l) => JSON.parse(l)); } catch { return []; }
};

/** Sends a text to every admin (NIPEI_ADMINS) with a WhatsApp on their profile; logs it. */
export async function avisarAdmins(texto: string) {
  const ids = (process.env.NIPEI_ADMINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  let ok = false;
  for (const p of getPessoas().filter((x) => ids.includes(x.id) && x.whatsapp)) ok = (await enviarWhatsApp(p.whatsapp, texto)) || ok;
  try { fs.mkdirSync(path.dirname(ARQ("x")), { recursive: true }); fs.appendFileSync(ARQ("alertas.jsonl"), JSON.stringify({ em: new Date().toISOString(), texto: texto.slice(0, 300), ok }) + "\n", { mode: 0o600 }); } catch { /* ignore */ }
  return ok;
}

let rodando = false, ultimaVolta = 0;
export function vigiarSaude() {
  if (rodando || Date.now() - ultimaVolta < 10 * 60_000 || !process.env.NIPEI_ADMINS) return;
  ultimaVolta = Date.now(); rodando = true;
  (async () => {
    const { dados } = await checarTudo(true);
    const antes = lerJson<Record<string, Estado>>("estados.json", {});
    const agora = Object.fromEntries(dados.map((d) => [d.id, d.estado])) as Record<string, Estado>;
    gravar("estados.json", agora);
    if (!alertasLigados()) return;
    const caiu = dados.filter((d) => d.estado === "erro" && antes[d.id] !== "erro");
    const voltou = dados.filter((d) => antes[d.id] === "erro" && d.estado !== "erro");
    if (!caiu.length && !voltou.length) return;
    const linhas = [...caiu.map((d) => `⚠️ ${d.nome}: ${d.resumo}`), ...voltou.map((d) => `✅ ${d.nome} voltou ao normal`)];
    await avisarAdmins(`Nipëi · painel de controle\n\n${linhas.join("\n")}\n\nhttps://os.nipeihu.app/controle`);
  })().catch(() => null).finally(() => { rodando = false; });
}
