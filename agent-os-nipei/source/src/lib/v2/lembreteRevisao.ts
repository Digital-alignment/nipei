import fs from "fs";
import path from "path";
import { getEquipes, getPessoas, vault } from "./data";
import { getFatos } from "./conhecimento";
import { enviarWhatsApp } from "./whatsapp";

// Weekly WhatsApp nudge: once per week, on Monday between 08:00 and 20:00 (Bahia), everyone who can review pending facts gets how
// many are waiting for them. Who can review = gestão (all of them, team or not — Ashuan and Jordão today) or the
// coordination of the fact's team, same rule as podeRevisar. Lazy, from the v2 layout (like the health alerts);
// <vault>/.jobs/lembrete-revisao.json keeps the last week sent. Same filters as the other notices: WhatsApp
// verified, notices on, not suspended.

const ARQ = () => path.join(vault(), ".jobs", "lembrete-revisao.json");
const LINK = "https://os.nipeihu.app/conhecimento/revisar";
let rodando = false;

/** ISO-ish week key of a Bahia day, Monday-based ("2026-11-02" for the week starting Monday 2 Nov). */
export function semanaDe(diaBahia: string): string {
  const d = new Date(`${diaBahia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The message per person (pure, testable): only people with ≥1 fact they can review. */
export function lembretes(pessoas: { id: string; name: string; equipes: string[]; coordena: string[] }[], gestaoIds: Set<string>, pendentes: { equipe: string }[]) {
  return pessoas.flatMap((p) => {
    const gestao = p.equipes.some((e) => gestaoIds.has(e));
    const n = pendentes.filter((f) => gestao || (!!f.equipe && p.coordena.includes(f.equipe))).length;
    return n ? [{ id: p.id, texto: `Oi, ${p.name.split(/[\s(]/)[0]}! ${n === 1 ? "Há 1 fato" : `Há ${n} fatos`} do Conhecimento esperando sua revisão. Revisar um por um: ${LINK}` }] : [];
  });
}

export function lembreteRevisao() {
  if (rodando || process.env.NODE_ENV !== "production") return; // npm run dev has real Evolution keys: never send from there
  const agora = new Date().toLocaleString("sv-SE", { timeZone: "America/Bahia" }); // "AAAA-MM-DD HH:MM:SS"
  const hoje = agora.slice(0, 10), semana = semanaDe(hoje);
  // only on Monday from 8h (Bahia): a week nobody opens the app on Monday is skipped, never sent late at night
  if (hoje !== semana || agora.slice(11, 13) < "08" || agora.slice(11, 13) >= "20") return;
  let ultima = "";
  try { ultima = JSON.parse(fs.readFileSync(ARQ(), "utf-8")).semana ?? ""; } catch { /* first time */ }
  if (ultima >= semana) return;
  rodando = true;
  try {
    fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
    fs.writeFileSync(ARQ(), JSON.stringify({ semana, em: agora })); // before sending: never twice in a week
  } catch { rodando = false; return; }
  const pendentes = getFatos().filter((f) => f.status === "proposto");
  const gestaoIds = new Set(getEquipes().filter((e) => e.gestao).map((e) => e.id));
  const pessoas = getPessoas().filter((p) => p.whatsapp && p.whatsappVerificado && p.avisosWhatsapp && !p.suspenso && !p.externo);
  const fone = new Map(pessoas.map((p) => [p.id, p.whatsapp]));
  void Promise.all(lembretes(pessoas, gestaoIds, pendentes).map((l) => enviarWhatsApp(fone.get(l.id)!, l.texto).catch(() => false)))
    .finally(() => { rodando = false; });
}

// self-check (pure parts): VAULT_PATH=<vault> npx tsx src/lib/v2/lembreteRevisao.ts
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/").replace(/^(?=[A-Z]:)/, "/")}`) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  assert(semanaDe("2026-11-05") === "2026-11-02", "quinta → segunda");
  assert(semanaDe("2026-11-02") === "2026-11-02", "segunda é ela mesma");
  assert(semanaDe("2026-11-08") === "2026-11-02", "domingo fecha a semana");
  const ps = [
    { id: "ashuan", name: "Ashuan", equipes: ["equipe_1"], coordena: [] },
    { id: "rodrigo", name: "Rodrigo Andrade", equipes: ["equipe_3"], coordena: ["equipe_3"] },
    { id: "kush", name: "Kush", equipes: ["equipe_2"], coordena: [] },
  ];
  const l = lembretes(ps, new Set(["equipe_1"]), [{ equipe: "" }, { equipe: "equipe_3" }, { equipe: "equipe_2" }]);
  assert(l.length === 2 && l[0].texto.includes("Há 3 fatos"), "gestão vê todos, inclusive sem equipe");
  assert(l[1].id === "rodrigo" && l[1].texto.includes("Há 1 fato do"), "coordenação só a da sua equipe");
  console.log("lembreteRevisao: ok");
}
