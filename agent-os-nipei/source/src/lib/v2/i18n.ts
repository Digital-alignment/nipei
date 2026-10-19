import { cookies } from "next/headers";

// UI chrome only: notes in the vault (task titles, descriptions) stay in the language they were written in.
export const LANG_COOKIE = "nipei_lang";
export type Lang = "pt" | "en";

const pt = {
  hoje: "Hoje", agenda: "Agenda", equipes: "Equipes", projetos: "Projetos", objetivos: "Objetivos", pessoas: "Pessoas",
  ola: "Olá", minhasTarefas: "Minhas tarefas", atrasadas: "Atrasadas", paraHoje: "Para hoje", proximas: "Próximas", semData: "Sem data",
  nadaPendente: "Nada pendente. 🌿", proximosEventos: "Próximos eventos", novaTarefa: "Nova tarefa", titulo: "Título",
  equipe: "Equipe", projeto: "Projeto", objetivo: "Objetivo", responsaveis: "Responsáveis", prazo: "Prazo", nenhum: "—",
  criar: "Criar", cancelar: "Cancelar", feito: "Feito", fazendo: "Fazendo", aFazer: "A fazer",
  membros: "Membros", coordenacao: "Coordenação", tarefasAbertas: "Tarefas abertas", todas: "Todas", semTarefas: "Nenhuma tarefa.",
  semTarefasLigadas: "Sem tarefas ligadas", semEquipe: "Sem equipe", fichaIncompleta: "Ficha incompleta", buscar: "Buscar",
  inativos: "Inativos / sem equipe", ativarEm: "Ativar em", ativar: "Ativar", confirmado: "Confirmado", aConfirmar: "A confirmar",
  sair: "Sair", versaoAnterior: "Versão anterior", idioma: "English", apoio: "Apoio", tarefas: "tarefas",
  semPrazo: "Tarefas sem prazo não aparecem aqui.", entrar: "Entrar", usuario: "Usuário", senha: "Senha", quemEntra: "Quem é você?",
  erroLogin: "Usuário ou senha inválidos.", erroServidor: "Falha ao conectar com o servidor.", legacyIntro: "A versão anterior continua disponível enquanto a nova é construída.",
  semResponsavel: "sem responsável", hojeDia: "hoje",
  lista: "Lista", mes: "Mês", semana: ["D", "S", "T", "Q", "Q", "S", "S"], nadaNoDia: "Nada neste dia.",
  googleTitulo: "Ver no Google Calendar", googleTexto: "No Google Calendar (computador): Outras agendas → + → Do URL, e cole este endereço. O Google atualiza a cada poucas horas. Eventos só com mês (sem dia) não entram até terem data.",
  falar: "Falar uma tarefa", ouvindo: "Ouvindo…", vozIndisponivel: "Este navegador não reconhece voz.",
};
type Dict = typeof pt;

const en: Dict = {
  hoje: "Today", agenda: "Agenda", equipes: "Teams", projetos: "Projects", objetivos: "Goals", pessoas: "People",
  ola: "Hi", minhasTarefas: "My tasks", atrasadas: "Overdue", paraHoje: "Today", proximas: "Upcoming", semData: "No date",
  nadaPendente: "Nothing pending. 🌿", proximosEventos: "Upcoming events", novaTarefa: "New task", titulo: "Title",
  equipe: "Team", projeto: "Project", objetivo: "Goal", responsaveis: "Owners", prazo: "Due date", nenhum: "—",
  criar: "Create", cancelar: "Cancel", feito: "Done", fazendo: "Doing", aFazer: "To do",
  membros: "Members", coordenacao: "Leads", tarefasAbertas: "Open tasks", todas: "All", semTarefas: "No tasks.",
  semTarefasLigadas: "No linked tasks", semEquipe: "No team", fichaIncompleta: "Incomplete profile", buscar: "Search",
  inativos: "Inactive / no team", ativarEm: "Activate in", ativar: "Activate", confirmado: "Confirmed", aConfirmar: "To be confirmed",
  sair: "Log out", versaoAnterior: "Previous version", idioma: "Português", apoio: "Support", tarefas: "tasks",
  semPrazo: "Tasks without a due date are not shown here.", entrar: "Log in", usuario: "Username", senha: "Password", quemEntra: "Who are you?",
  erroLogin: "Invalid username or password.", erroServidor: "Could not reach the server.", legacyIntro: "The previous version stays available while the new one is being built.",
  semResponsavel: "no owner", hojeDia: "today",
  lista: "List", mes: "Month", semana: ["S", "M", "T", "W", "T", "F", "S"], nadaNoDia: "Nothing on this day.",
  googleTitulo: "View in Google Calendar", googleTexto: "In Google Calendar (desktop): Other calendars → + → From URL, and paste this address. Google refreshes it every few hours. Events with only a month (no day) are left out until they get a date.",
  falar: "Say a task", ouvindo: "Listening…", vozIndisponivel: "This browser can't recognise speech.",
};

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "pt";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: lang === "en" ? en : pt };
}

/** "2026-10-19" → "19 out" / "Oct 19" */
export function fmtDate(iso: string, lang: Lang) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  const opts: Intl.DateTimeFormatOptions = d ? { day: "numeric", month: "short", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" };
  return date.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", opts).replace(".", "");
}
