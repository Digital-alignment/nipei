import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { createTarefa, getPessoas, getTarefas, today, vault, type Equipe, type Pessoa, type Tarefa } from "./data";
import { requestSync } from "@/lib/tarefaNote";

// Team meeting: an agenda built from the team's live tasks since the last meeting, and minutes
// (ata) in Reunioes/<equipe>/<data>.md. Each "encaminhamento" line becomes a task in the team
// ("@Nome" → owner, "até 25/10" → due date), so decisions don't stay on paper.

export type Ata = { file: string; data: string; por: string; presentes: string[]; decisoes: string; encaminhamentos: { texto: string; tarefa: string }[] };

const DIR = (equipe: string) => path.join(vault(), "Reunioes", equipe.replace(/[^a-zA-Z0-9_-]/g, "_"));
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const somaDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function atas(equipe: string): Ata[] {
  try {
    return fs.readdirSync(DIR(equipe)).filter((f) => f.endsWith(".md")).sort().reverse().flatMap((f) => {
      const m = fs.readFileSync(path.join(DIR(equipe), f), "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const fm = (m && yaml.load(m[1])) as Record<string, unknown> | null;
      return fm ? [{ file: f, data: String(fm.data ?? ""), por: String(fm.por ?? ""), presentes: (fm.presentes as string[]) ?? [], decisoes: String(fm.decisoes ?? ""), encaminhamentos: (fm.encaminhamentos as Ata["encaminhamentos"]) ?? [] }] : [];
    });
  } catch { return []; }
}

/** What the meeting should look at: since the last meeting (or 7 days), plus the next 7 days. */
export function pauta(e: Equipe, hoje = today()) {
  const ultima = atas(e.id)[0];
  const desde = ultima?.data || somaDias(hoje, -7);
  const ts = getTarefas().filter((t) => t.equipe === e.id);
  const abertas = ts.filter((t) => t.status !== "done");
  const porData = (a: Tarefa, b: Tarefa) => (a.prazo || "9999").localeCompare(b.prazo || "9999");
  const pendentesDaUltima = (ultima?.encaminhamentos ?? []).map((x) => ts.find((t) => t.id === x.tarefa)).filter((t): t is Tarefa => !!t && t.status !== "done");
  return {
    desde, ultima,
    feitas: ts.filter((t) => t.concluidoEm && t.concluidoEm.slice(0, 10) >= desde).sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm)),
    atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).sort(porData),
    semana: abertas.filter((t) => t.prazo >= hoje && t.prazo <= somaDias(hoje, 7)).sort(porData),
    semDono: abertas.filter((t) => !t.responsaveis.length).sort(porData),
    pendentesDaUltima,
  };
}

export function textoPauta(e: Equipe, p: ReturnType<typeof pauta>, dataReuniao: string, pessoas: Pessoa[], origin: string) {
  const nome = (id: string) => pessoas.find((x) => x.id === id)?.name.split(" ")[0] ?? id;
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const linha = (t: Tarefa, data = true) => `• ${t.title}${t.responsaveis.length ? ` — ${t.responsaveis.map(nome).join(", ")}` : ""}${data && t.prazo ? ` (${dm(t.prazo)})` : ""}`;
  const bloco = (titulo: string, ts: Tarefa[], data = true, max = 10) => ts.length ? [`*${titulo}* (${ts.length})`, ...ts.slice(0, max).map((t) => linha(t, data)), ...(ts.length > max ? [`…+${ts.length - max}`] : [])].join("\n") : "";
  return [
    `🗓️ *Reunião ${e.nome}* — ${dm(dataReuniao)}`,
    bloco("Pendentes da última reunião", p.pendentesDaUltima),
    bloco(`✅ Feitas desde ${dm(p.desde)}`, p.feitas, false),
    bloco("⚠️ Atrasadas", p.atrasadas),
    bloco("📅 Próximos 7 dias", p.semana),
    bloco("🙋 Sem responsável", p.semDono, true, 5),
    `👉 ${origin}/equipes/${e.id}/reuniao`,
  ].filter(Boolean).join("\n\n");
}

/** "@Bruna" / "@bruna_retiros" → person of the team (first name, apelido or id); "até 25/10" → ISO date. */
export function lerEncaminhamento(linha: string, membros: Pessoa[], hoje = today()) {
  let texto = linha.replace(/^[-•*\s]+/, "").trim();
  const responsaveis: string[] = [];
  for (const m of texto.matchAll(/@([\wÀ-ÿ.-]+)/g)) {
    const k = semAcento(m[1]).replace(/[.-]+$/, "");
    const p = membros.find((x) => x.id === k || semAcento(x.name.split(" ")[0]) === k || (x.apelido && semAcento(x.apelido) === k));
    if (p && !responsaveis.includes(p.id)) responsaveis.push(p.id);
  }
  let prazo = "";
  const d = texto.match(/\baté\s+(\d{1,2})\/(\d{1,2})\b/i);
  if (d) {
    const ano = Number(hoje.slice(0, 4));
    const iso = (a: number) => `${a}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
    prazo = iso(ano) < somaDias(hoje, -30) ? iso(ano + 1) : iso(ano); // "até 05/01" in December → next year
    texto = texto.replace(d[0], "");
  }
  texto = texto.replace(/@[\wÀ-ÿ.-]+/g, (s) => s.slice(1)).replace(/\s+/g, " ").trim();
  return { titulo: texto.slice(0, 200), responsaveis, prazo };
}

export function salvarAta(e: Equipe, input: { data: string; presentes: string[]; decisoes: string; encaminhamentos: string }, actor: string) {
  const membros = getPessoas().filter((p) => p.equipes.includes(e.id));
  const encaminhamentos = input.encaminhamentos.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30).map((l) => {
    const x = lerEncaminhamento(l, membros);
    if (!x.titulo) return null;
    const id = createTarefa({ title: x.titulo, equipe: e.id, prazo: x.prazo, responsaveis: x.responsaveis, projeto: "", objetivo: "", recorrencia: "" }, actor,
      { descricao: `Encaminhamento da reunião da equipe ${e.nome} de ${input.data}.` });
    return { texto: l, tarefa: String(id) };
  }).filter((x): x is Ata["encaminhamentos"][number] => !!x);
  const fm = { type: "reuniao_equipe", equipe: e.id, data: input.data, por: actor, presentes: input.presentes, decisoes: input.decisoes.trim(), encaminhamentos };
  const corpo = [`# Reunião ${e.nome} — ${input.data}`, "", "## Decisões", input.decisoes.trim() || "—", "", "## Encaminhamentos", ...encaminhamentos.map((x) => `- ${x.texto} → ${x.tarefa}`)].join("\n");
  fs.mkdirSync(DIR(e.id), { recursive: true });
  let file = path.join(DIR(e.id), `${input.data}.md`);
  for (let i = 2; fs.existsSync(file); i++) file = path.join(DIR(e.id), `${input.data}-${i}.md`);
  fs.writeFileSync(file, `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n${corpo}\n`, "utf-8");
  requestSync(vault());
  return encaminhamentos.length;
}
