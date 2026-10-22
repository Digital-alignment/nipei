import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Title } from "@/components/v2/ui";
import NovaTarefaForm from "@/components/v2/NovaTarefaForm";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

type Q = { equipe?: string; projeto?: string; objetivo?: string; back?: string; prazo?: string; responsavel?: string; criada?: string };

export default async function NovaTarefa({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const { t } = await getT();
  const user = (await currentUser())!;
  const me = user.pessoa;
  // Only the teams this person may create tasks in (plan §4.4); "no team" is for gestão only.
  const equipes = getEquipes().filter((e) => can.criarEm(user, e.id));
  const equipeInicial = equipes.some((e) => e.id === q.equipe) ? q.equipe! : me?.equipes.find((id) => equipes.some((e) => e.id === id)) ?? equipes[0]?.id ?? "";
  const pessoas = getPessoas().filter((p) => !p.externo).sort((a, b) => a.name.localeCompare(b.name, "pt")); // access doesn't matter for assigning
  const back = q.back?.startsWith("/") && !q.back.startsWith("//") ? q.back : "/hoje";
  const criada = q.criada ? getTarefas().find((x) => x.id === q.criada) : undefined;

  return (
    <div className="max-w-3xl mx-auto">
      <Title>{t.novaTarefa}</Title>
      {criada && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" /><span className="flex-1 min-w-0 truncate">{t.tarefaCriada}: {criada.title}</span>
          <Link href={`/tarefas/${criada.id}`} className="underline shrink-0">{t.abrir}</Link>
        </p>
      )}
      <NovaTarefaForm
        equipes={equipes.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, areas: e.areas }))}
        pessoas={pessoas.map((p) => ({ id: p.id, nome: p.name, equipes: p.equipes, coordena: p.coordena, suspenso: p.suspenso }))}
        projetos={getProjetos().map((p) => ({ id: p.id, nome: p.nome }))}
        objetivos={getObjetivos().map((o) => ({ id: o.id, titulo: o.titulo, ano: o.ano, projeto: o.projeto }))}
        inicial={{
          equipe: equipeInicial, projeto: q.projeto ?? "", objetivo: q.objetivo ?? "",
          prazo: /^\d{4}-\d{2}-\d{2}$/.test(q.prazo ?? "") ? q.prazo! : "",
          responsaveis: q.responsavel ? [q.responsavel] : !q.criada && me ? [me.id] : [],
        }}
        podeSemEquipe={user.gestao} meId={me?.id ?? ""} back={back}
        l={{
          titulo: t.titulo, tituloPh: t.tituloPh, descricao: t.descricao, descricaoPh: t.descricaoPh, equipe: t.equipe, nenhum: t.nenhum, area: t.areaEquipe,
          prioridade: t.prioridade, prazo: t.prazo, hoje: t.hoje, amanha: t.amanha, sexta: t.sextaLbl, proximaSemana: t.proximaSemana, semPrazo: t.semPrazoLbl,
          repetir: t.repetir, naoRepete: t.naoRepete, semanal: t.semanal, quinzenal: t.quinzenal, mensal: t.mensal, repeteAviso: t.repeteAviso,
          projeto: t.projeto, objetivo: t.objetivo, responsaveis: t.responsaveis, buscarPessoa: t.buscarPessoa, eu: t.euLbl, checklist: t.checklist,
          checklistPh: t.checklistPh, criar: t.criar, criarOutra: t.criarOutra, cancelar: t.cancelar, suspenso: t.suspensoLbl, nenhumaPessoa: t.nenhumaPessoa,
          prio: { baixa: t.prioBaixa, "média": t.prioMedia, alta: t.prioAlta, urgente: t.prioUrgente }, grupos: t.gruposResp,
        }}
      />
    </div>
  );
}
