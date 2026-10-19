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
  cadastroTitulo: "Cadastro", cadastroIntro: "Confira e complete seus dados. Só a coordenação vê estas informações.",
  nome: "Nome", nomeNativo: "Nome na língua (opcional)", whatsapp: "WhatsApp (com DDD)", email: "E-mail", area: "Onde você atua",
  funcao: "O que você faz", disponibilidade: "Disponibilidade (dias / horários)", salvar: "Salvar", obrigado: "Obrigado! Seus dados foram salvos.",
  linkInvalido: "Este link expirou ou não é válido. Peça um novo para a coordenação.", semAcesso: "Sua equipe ainda não tem acesso à plataforma.",
  linkCadastro: "Link de cadastro", linkAcesso: "Link de acesso", enviarWhats: "Enviar por WhatsApp", copiarLink: "Ou copie o link:",
  msgCadastro: "Olá {nome}! Este é o seu link para completar o cadastro no Nipëi:", msgAcesso: "Olá {nome}! Este é o seu link para entrar no Nipëi (vale 7 dias):",
  acessoPlataforma: "Acesso à plataforma", acessoLigado: "Membros desta equipe podem entrar", acessoDesligado: "Membros desta equipe ainda não entram",
  ligar: "Liberar acesso", desligar: "Tirar acesso", novaPessoa: "Nova pessoa", adicionar: "Adicionar", cadastradoEm: "Cadastro feito em",
  equipeSemAcesso: "Nenhuma equipe desta pessoa tem acesso ainda.", semContato: "Sem WhatsApp: copie o link e envie por outro meio.",
  financas: "Finanças", entradas: "Entradas", despesas: "Despesas", saldoMes: "Saldo do mês", saldoTotal: "Saldo acumulado",
  novoLancamento: "Novo lançamento", entrada: "Entrada", despesa: "Despesa", data: "Data", valor: "Valor (R$)", categoria: "Categoria",
  descricao: "Descrição", porCategoria: "Despesas por categoria", porProjeto: "Por projeto", ultimosMeses: "Últimos 6 meses",
  lancamentos: "Lançamentos", anular: "Anular", anulado: "anulado", semLancamentos: "Nenhum lançamento neste mês.", geral: "Geral",
  acervo: "Acervo", acervoIntro: "Os arquivos ficam no Google Drive; aqui fica o índice. Quem abrir precisa ter permissão na pasta.",
  novoItem: "Adicionar ao acervo", link: "Link (Google Drive)", tipo: "Tipo", ano: "Ano", abrir: "Abrir", semItens: "Nada encontrado.",
  tipos: { fotos: "Fotos", videos: "Vídeos", audios: "Áudios", cursos: "Cursos", documentos: "Documentos", marca: "Marca", outros: "Outros" } as Record<string, string>,
  editar: "Editar", editarTarefa: "Editar tarefa", status: "Status", areaEquipe: "Área (opcional)", semPermissao: "Você não pode editar esta tarefa.",
  semEquipeIntro: "Tarefas que ainda não têm equipe. Escolha a equipe (e, se quiser, quem faz) para tirá-las daqui.", atribuir: "Atribuir", ninguem: "Ninguém",
  novoEvento: "Novo evento", editarEvento: "Editar evento", inicio: "Início", fim: "Fim (opcional)", soMes: "Hoje só tem mês/ano:",
  donoEquipe: "Equipe dona", donoProposto: "Dono proposto — confirme ou troque", confirmarDono: "Confirmar", donoConfirmado: "Dono confirmado",
  descricaoTitulo: "Descrição", semDescricao: "Ainda sem descrição. O que precisa ser feito?", editarDescricao: "Editar descrição",
  checklist: "Checklist", novoItem2: "Novo item…", anexos: "Anexos", semAnexos: "Nenhum anexo.", adicionarLink: "Adicionar link",
  tituloLink: "Nome (opcional)", arquivo: "Arquivo", foto: "Foto", enviando: "Enviando…", maximo: "Máximo 10 MB. Para vídeos e arquivos grandes, use um link do Drive.",
  remover: "Remover", atividade: "Atividade", comentar: "Comentar", escreverComentario: "Escrever um comentário…", origem: "Origem",
  verMais: "ver histórico completo",
  iaTitulo: "IA", iaDetalhar: "Explicar e detalhar", iaProximo: "O que fazer agora?", iaAtualizar: "Atualizar com anexos",
  iaPensando: "A IA está lendo a tarefa, as notas e os anexos…", iaAplicar: "Aplicar selecionados", iaDescartar: "Descartar",
  iaNovaDescricao: "Nova descrição (pode editar antes de aplicar)", iaAdicionar: "Adicionar à checklist", iaConcluir: "Marcar como feito",
  iaProximoPasso: "Registrar como comentário: próximo passo", iaStatus: "Mudar status para", iaPrazo: "Mudar prazo para", iaFontes: "Fontes",
  iaNada: "A IA não sugeriu mudanças.", iaAviso: "Sugestão da IA: confira antes de aplicar",
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
  cadastroTitulo: "Registration", cadastroIntro: "Check and complete your details. Only the coordination sees this.",
  nome: "Name", nomeNativo: "Name in your language (optional)", whatsapp: "WhatsApp (with area code)", email: "E-mail", area: "Where you work",
  funcao: "What you do", disponibilidade: "Availability (days / hours)", salvar: "Save", obrigado: "Thank you! Your details were saved.",
  linkInvalido: "This link has expired or is not valid. Ask the coordination for a new one.", semAcesso: "Your team does not have access to the platform yet.",
  linkCadastro: "Registration link", linkAcesso: "Login link", enviarWhats: "Send by WhatsApp", copiarLink: "Or copy the link:",
  msgCadastro: "Hi {nome}! Here is your link to complete your registration in Nipëi:", msgAcesso: "Hi {nome}! Here is your link to log in to Nipëi (valid for 7 days):",
  acessoPlataforma: "Platform access", acessoLigado: "Members of this team can log in", acessoDesligado: "Members of this team cannot log in yet",
  ligar: "Grant access", desligar: "Remove access", novaPessoa: "New person", adicionar: "Add", cadastradoEm: "Registered on",
  equipeSemAcesso: "None of this person's teams has access yet.", semContato: "No WhatsApp: copy the link and send it another way.",
  financas: "Finances", entradas: "Income", despesas: "Expenses", saldoMes: "Month balance", saldoTotal: "Running balance",
  novoLancamento: "New entry", entrada: "Income", despesa: "Expense", data: "Date", valor: "Amount (R$)", categoria: "Category",
  descricao: "Description", porCategoria: "Expenses by category", porProjeto: "By project", ultimosMeses: "Last 6 months",
  lancamentos: "Entries", anular: "Void", anulado: "voided", semLancamentos: "No entries this month.", geral: "General",
  acervo: "Archive", acervoIntro: "Files stay in Google Drive; this is the index. Whoever opens one needs permission on the folder.",
  novoItem: "Add to archive", link: "Link (Google Drive)", tipo: "Type", ano: "Year", abrir: "Open", semItens: "Nothing found.",
  tipos: { fotos: "Photos", videos: "Videos", audios: "Audio", cursos: "Courses", documentos: "Documents", marca: "Brand", outros: "Other" },
  editar: "Edit", editarTarefa: "Edit task", status: "Status", areaEquipe: "Area (optional)", semPermissao: "You can't edit this task.",
  semEquipeIntro: "Tasks with no team yet. Pick the team (and, if you want, who does it) to move them out of here.", atribuir: "Assign", ninguem: "Nobody",
  novoEvento: "New event", editarEvento: "Edit event", inicio: "Start", fim: "End (optional)", soMes: "Only month/year today:",
  donoEquipe: "Owner team", donoProposto: "Proposed owner — confirm or change", confirmarDono: "Confirm", donoConfirmado: "Owner confirmed",
  descricaoTitulo: "Description", semDescricao: "No description yet. What needs to be done?", editarDescricao: "Edit description",
  checklist: "Checklist", novoItem2: "New item…", anexos: "Attachments", semAnexos: "No attachments.", adicionarLink: "Add link",
  tituloLink: "Name (optional)", arquivo: "File", foto: "Photo", enviando: "Uploading…", maximo: "Max 10 MB. For videos and large files, use a Drive link.",
  remover: "Remove", atividade: "Activity", comentar: "Comment", escreverComentario: "Write a comment…", origem: "Origin",
  verMais: "see full history",
  iaTitulo: "AI", iaDetalhar: "Explain and detail", iaProximo: "What to do now?", iaAtualizar: "Update from attachments",
  iaPensando: "The AI is reading the task, notes and attachments…", iaAplicar: "Apply selected", iaDescartar: "Discard",
  iaNovaDescricao: "New description (you can edit it before applying)", iaAdicionar: "Add to checklist", iaConcluir: "Mark as done",
  iaProximoPasso: "Save as comment: next step", iaStatus: "Change status to", iaPrazo: "Change due date to", iaFontes: "Sources",
  iaNada: "The AI suggested no changes.", iaAviso: "AI suggestion: check before applying",
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
