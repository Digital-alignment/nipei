import { ToastAoAbrir } from "@/components/ds/Toast";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";

import NovaTarefaForm from "@/components/v2/NovaTarefaForm";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

type Q = { equipe?: string; projeto?: string; objetivo?: string; back?: string; prazo?: string; responsavel?: string; criada?: string; status?: string };

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
      <CabecalhoPagina titulo={<>{t.novaTarefa}</>} />
      <ToastAoAbrir texto={criada ? `${t.tarefaCriada}: ${criada.title}` : undefined} parametro="criada" acao={criada ? { rotulo: t.abrir, href: `/tarefas/${criada.id}` } : undefined} />
      <NovaTarefaForm
        equipes={equipes.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, areas: e.areas }))}
        pessoas={pessoas.map((p) => ({ id: p.id, nome: p.name, equipes: p.equipes, coordena: p.coordena, suspenso: p.suspenso, foto: p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined }))}
        projetos={getProjetos().map((p) => ({ id: p.id, nome: p.nome }))}
        objetivos={getObjetivos().map((o) => ({ id: o.id, titulo: o.titulo, ano: o.ano, projeto: o.projeto }))}
        inicial={{
          equipe: equipeInicial, projeto: q.projeto ?? "", objetivo: q.objetivo ?? "",
          prazo: /^\d{4}-\d{2}-\d{2}$/.test(q.prazo ?? "") ? q.prazo! : "",
          responsaveis: q.responsavel ? [q.responsavel] : !q.criada && me ? [me.id] : [],
          status: q.status === "doing" || q.status === "done" ? q.status : undefined,
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
