import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EstadoVazio } from "@/components/ds/Estados";
import NovaTarefaForm from "@/components/v2/NovaTarefaForm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, podeVerProjeto } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";


export default async function EditarTarefa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const tarefa = getTarefas().find((x) => x.id === id);
  if (!tarefa) notFound();
  // Back to where the task was opened from (same-origin path only).
  const ref = (await headers()).get("referer");
  const refPath = ref ? new URL(ref).pathname + new URL(ref).search : "";
  const raw = q.back ?? refPath;
  // Default back is the task's own detail page.
  const back = raw.startsWith("/") && !raw.startsWith("//") && !raw.endsWith("/editar") ? raw : `/tarefas/${id}`;

  if (!can.editTarefa(me, tarefa) && !can.assumir(me, tarefa)) {
    return (<><CabecalhoPagina titulo={<>{tarefa.title}</>} /><EstadoVazio compacto titulo={<>{t.semPermissao}</>} /><Link href={back} className="text-sm underline">{t.cancelar}</Link></>);
  }

  const equipes = getEquipes().filter((e) => e.id === tarefa.equipe || can.criarEm(me, e.id));
  // everyone who can take a task (access doesn't matter); current owners always stay listed so saving never drops them
  const pessoas = getPessoas().filter((p) => (!p.externo && !p.contato) || tarefa.responsaveis.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const projetos = getProjetos().filter((p) => podeVerProjeto(me, p) || p.id === tarefa.projeto), objetivos = getObjetivos().filter((o) => o.status === "ativo" || o.id === tarefa.objetivo);
  const prio = (tarefa.priority || "").replace(/^media$/, "média");

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo={<>{t.editarTarefa}</>} />
      {tarefa.responsible && tarefa.responsaveis.length === 0 && <p className="meta mb-4 text-t2">v1: {tarefa.responsible}</p>}
      <NovaTarefaForm
        editar={{ id: tarefa.id, title: tarefa.title, status: tarefa.status, prioridade: ["baixa", "média", "alta", "urgente"].includes(prio) ? prio : "média", recorrencia: tarefa.recorrencia, area: tarefa.area }}
        equipes={equipes.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, areas: e.areas }))}
        pessoas={pessoas.map((p) => ({ id: p.id, nome: p.name, equipes: p.equipes, coordena: p.coordena, suspenso: p.suspenso, foto: p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined }))}
        projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
        objetivos={objetivos.map((o) => ({ id: o.id, titulo: o.titulo, ano: o.ano, projeto: o.projeto }))}
        inicial={{ equipe: tarefa.equipe, projeto: tarefa.projeto, objetivo: tarefa.objetivo, prazo: tarefa.prazo, responsaveis: tarefa.responsaveis }}
        podeSemEquipe={me.gestao || !tarefa.equipe} meId={me.pessoa?.id ?? ""} back={back}
        l={{
          titulo: t.titulo, tituloPh: t.tituloPh, descricao: t.descricao, descricaoPh: t.descricaoPh, equipe: t.equipe, nenhum: t.nenhum, area: t.areaEquipe,
          prioridade: t.prioridade, prazo: t.prazo, hoje: t.hoje, amanha: t.amanha, sexta: t.sextaLbl, proximaSemana: t.proximaSemana, semPrazo: t.semPrazoLbl,
          repetir: t.repetir, naoRepete: t.naoRepete, semanal: t.semanal, quinzenal: t.quinzenal, mensal: t.mensal, repeteAviso: t.repeteAviso,
          projeto: t.projeto, objetivo: t.objetivo, responsaveis: t.responsaveis, buscarPessoa: t.buscarPessoa, eu: t.euLbl, checklist: t.checklist,
          checklistPh: t.checklistPh, criar: t.criar, criarOutra: t.criarOutra, outra: t.outraCurto, cancelar: t.cancelar, salvar: t.salvar, status: t.status, aFazer: t.aFazer, fazendo: t.fazendo, feito: t.feito,
          suspenso: t.suspensoLbl, nenhumaPessoa: t.nenhumaPessoa,
          prio: { baixa: t.prioBaixa, "média": t.prioMedia, alta: t.prioAlta, urgente: t.prioUrgente }, grupos: t.gruposResp,
        }}
      />
    </div>
  );
}
