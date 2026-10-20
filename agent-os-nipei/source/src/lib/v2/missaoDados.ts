import { getObjetivos, getPessoas, getTarefas, today, type Me } from "./data";
import { getFatos, getFontes, podeRevisar } from "./conhecimento";
import { diagnosticosAbertos, progresso } from "./diagnostico";
import { perfilPendente } from "./perfil";
import { MISSAO, calcularMissao } from "./missao";

// Live inputs for Hoje's "Missão da semana" panel and "Primeiros passos" checklist.

// who did it: notes store the actor name (actorName() in actions.ts), a few older ones the person id
const sou = (me: Me) => { const nomes = new Set([me.pessoa?.name.split(" (")[0] ?? me.username, me.pessoa?.id ?? "", me.username]); return (v: string) => !!v && nomes.has(v); };

/** The current mission for this person's team (members and gestão see it), or null when none is running. */
export function missaoDaSemana(me: Me) {
  if (!me.gestao && !me.equipes.includes(MISSAO.equipe)) return null;
  const hoje = today();
  const tarefas = getTarefas(), abertas = tarefas.filter((t) => t.status !== "done");
  const membros = getPessoas().filter((p) => p.equipes.includes(MISSAO.equipe));
  const diagOk = (pid: string) => {
    const p = membros.find((x) => x.id === pid)!;
    const ds = diagnosticosAbertos(p);
    return ds.length > 0 && ds.every((d) => { const r = progresso(d, pid); return r.total > 0 && r.respondidas >= r.total; });
  };
  const objetivos = getObjetivos();
  const r = calcularMissao(MISSAO, {
    membros: membros.map((p) => ({ id: p.id, perfilOk: !perfilPendente(p) && !!p.whatsapp, abertas: abertas.filter((t) => t.responsaveis.includes(p.id)).length, diagnosticoOk: diagOk(p.id) })),
    fatosPropostos: getFatos().filter((f) => f.status === "proposto").length,
    fontesNovas: getFontes().filter((f) => f.enviadoEm.slice(0, 10) >= MISSAO.inicio && f.enviadoPor !== "migracao").length, // the old-notes migration is not new knowledge
    semDono: abertas.filter((t) => !t.responsaveis.length).length,
    semEquipe: abertas.filter((t) => !t.equipe).length,
    atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length,
    objetivos: { total: objetivos.length, comDono: objetivos.filter((o) => o.donoConfirmado).length },
  }, hoje);
  return r.ativa ? { ...r, missao: MISSAO } : null;
}

export type Passo = { id: "dados" | "whatsapp" | "foto" | "diagnostico" | "revisar" | "fonte"; feito: boolean; href: string };

/** First steps for a new person, ticked automatically from what they actually did. */
export function primeirosPassos(me: Me): Passo[] {
  const p = me.pessoa;
  if (!p) return [];
  const editar = `/pessoas/${p.id}/editar`;
  const pend = perfilPendente(p);
  const passos: Passo[] = [
    { id: "dados", feito: pend !== "confirmar", href: editar },
    { id: "whatsapp", feito: !!p.whatsapp && p.whatsappVerificado, href: editar },
    { id: "foto", feito: !!p.foto, href: editar },
  ];
  const d = diagnosticosAbertos(p)[0];
  if (d) { const r = progresso(d, p.id); passos.push({ id: "diagnostico", feito: r.total > 0 && r.respondidas >= r.total, href: `/pessoas/${p.id}/respostas?d=${d.id}` }); }
  const eu = sou(me), fatos = getFatos();
  if (fatos.some((f) => podeRevisar(me, f))) passos.push({ id: "revisar", feito: fatos.some((f) => eu(f.revisadoPor)), href: "/conhecimento" });
  passos.push({ id: "fonte", feito: getFontes().some((f) => eu(f.enviadoPor)), href: "/conhecimento" });
  return passos;
}
