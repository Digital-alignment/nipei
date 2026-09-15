export type NucleusRole = "sagrado" | "comercial";

export type SquadId =
  | "squad_1_ceo"
  | "squad_2_mutum"
  | "squad_3_retiros"
  | "squad_4_vendas_mkt"
  | "squad_5_adm_legal"
  | "squad_6_infra"
  | "squad_7_instituto"
  | "super_user";

export interface SquadMeta {
  id: SquadId;
  name: string;
  nucleus: NucleusRole;
  module: "Nipëi Flow" | "Nipëi People" | "Nipëi Brain" | "Cross-cutting";
  description: string;
  iconName: string;
}

export const SQUADS: SquadMeta[] = [
  { id: "super_user", name: "Visão Consolidada (Super-Usuário)", nucleus: "sagrado", module: "Cross-cutting", description: "Acesso total consolidado a todos os Squads (ex: Ana Castro)", iconName: "Crown" },
  { id: "squad_7_instituto", name: "Squad VII — Instituto & Donadores", nucleus: "sagrado", module: "Nipëi People", description: "Articulação Mutum, Donantes & Certificação de Origem Éica (Veto Comercial)", iconName: "ShieldCheck" },
  { id: "squad_1_ceo", name: "Squad I — Estratégia / CEO", nucleus: "comercial", module: "Nipëi Brain", description: "Governança, IA de Priorização de Agenda & WhatsApp Bot Conversacional", iconName: "Brain" },
  { id: "squad_2_mutum", name: "Squad II — Produção Mutum", nucleus: "comercial", module: "Nipëi Flow", description: "Bioeconomia, Trazabilidade Florestal, Fichas Técnicas & OCR/QR", iconName: "Package" },
  { id: "squad_3_retiros", name: "Squad III — Logística Retiros & Hospitalidade", nucleus: "comercial", module: "Nipëi Flow", description: "Saída QR no celular, CRM Hóspedes & Portal do Participante", iconName: "Calendar" },
  { id: "squad_4_vendas_mkt", name: "Squad IV — Vendas, Mkt & Infra Tech", nucleus: "comercial", module: "Cross-cutting", description: "Baixa automática por Pedido Pago via Ficha Técnica & LTV Analytics", iconName: "ShoppingBag" },
  { id: "squad_5_adm_legal", name: "Squad V — Adm / Legal / Financeiro", nucleus: "comercial", module: "Nipëi Brain", description: "Fechamento Financeiro DRE por Centro de Custo & Arquivo Fiscal OCR", iconName: "FileSpreadsheet" },
  { id: "squad_6_infra", name: "Squad VI — Infraestrutura & Manutenção", nucleus: "comercial", module: "Nipëi Flow", description: "Chamados de Reparo vinculados ao Estoque de Peças de Reposição", iconName: "Wrench" },
];

export interface FichaTecnica {
  productId: string;
  productName: string;
  ingredients: {
    inventoryId: string;
    inventoryName: string;
    quantityRequired: number;
    unit: string;
  }[];
}

export interface MaintenanceOrder {
  id: string;
  assetName: string;
  location: string;
  issueDescription: string;
  priority: "urgente" | "alta" | "media";
  status: "aberto" | "em_manutencao" | "concluido";
  partsRequired: {
    inventoryId: string;
    partName: string;
    qty: number;
  }[];
}

export interface ECommerceOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: {
    productId: string;
    productName: string;
    qty: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  status: "Pendente" | "Pago" | "Cancelado";
  date: string;
  inventoryDeducted: boolean;
}

export interface EthicalCertification {
  productId: string;
  productName: string;
  squadOrigin: "Squad II (Mutum)";
  certifiedBy: string;
  certificationDate: string;
  status: "APROVADO_COMERCIAL" | "VETADO_NUCLEO_SAGRADO" | "PENDENTE_ANALISE";
  notes: string;
}

export interface CEOAITaskAdvice {
  id: string;
  priorityScore: number;
  title: string;
  context: string;
  suggestedAction: string;
  deadline: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "materia_prima" | "botica_preparacao" | "empaque_ambar" | "etiqueta_dtf" | "retiro_insumo" | "peca_reposicao";
  origin: string;
  stock: number;
  unit: string;
  minStock: number;
  unitCost: number;
  ethicallyCertified: boolean;
  squad: string;
}

export interface TraceabilityRecord {
  batchId: string;
  productName: string;
  harvestDate: string;
  pajeApprover: string;
  locationOrigin: string;
  currentLocation: string;
  status: "Colheita Ritual" | "Transporte Acre->Bahía" | "Laboratório Boticário" | "Pronto P/ Venda" | "Consumido em Retiro";
  qrCode: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "participante" | "comprador" | "doador" | "multiplo";
  totalSpent: number;
  totalDonated: number;
  ltv: number;
  retreatsAttended: string[];
  purchasesCount: number;
  anamnesis: {
    bloodType: string;
    allergies: string[];
    medications: string[];
    spiritualIntention: string;
    aiEmotionalScore: number;
    aiNotes: string;
    isProtected: boolean;
  };
}

export interface DREEntry {
  id: string;
  date: string;
  description: string;
  type: "receita" | "despesa";
  amount: number;
  costCenter: "Inî Rau E-Commerce" | "Dietas Samakey" | "Instituto Mutum" | "Infraestrutura Serra Grande";
  squad: string;
  whatsappLogged?: boolean;
}

export type KanbanColumnId = "triage" | "todo" | "in_progress" | "agent_executing" | "review" | "done";

export interface TaskComment {
  id: string;
  author: string;
  avatar?: string;
  role?: string;
  text: string;
  createdAt: string;
  isAgent?: boolean;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface GlobalTask {
  id: string;
  title: string;
  project?: string;
  assignee: string;
  squad: SquadId;
  priority: "urgente" | "alta" | "media" | "baixa";
  status: "pendente" | "em_progresso" | "concluido";
  columnStatus: KanbanColumnId;
  dueDate: string;
  description?: string;
  assignedAgents: string[]; // e.g. ["antigravity", "hermes", "claude"]
  executionLogs?: string[];
  comments?: TaskComment[];
  checklist?: TaskChecklistItem[];
  vaultPath?: string;
}

export interface PassiveCaptureLog {
  id: string;
  timestamp: string;
  source: "WhatsApp Audio" | "WhatsApp Photo OCR" | "Voice Memo";
  sender: string;
  transcription: string;
  parsedAction: string;
  status: "Processado" | "Pendente Validação";
}

// Data Stores
export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "INV-001", name: "Resina Sagrada Nisurau (Matéria-Prima)", category: "materia_prima", origin: "Aldeia Mutum, Acre", stock: 150, unit: "litros", minStock: 20, unitCost: 15.0, ethicallyCertified: true, squad: "Squad II (Mutum)" },
  { id: "INV-002", name: "Preparação Nisurau (Óleo Resina 100ml)", category: "botica_preparacao", origin: "Aldeia Mutum, Acre", stock: 45, unit: "frascos", minStock: 10, unitCost: 35.0, ethicallyCertified: true, squad: "Squad II (Mutum)" },
  { id: "INV-003", name: "Vitxy Rau (Tintura Sagrada 50ml)", category: "botica_preparacao", origin: "Aldeia Mutum, Acre", stock: 28, unit: "frascos", minStock: 8, unitCost: 42.0, ethicallyCertified: true, squad: "Squad II (Mutum)" },
  { id: "INV-004", name: "Frascos Vidro Ámbar 100ml", category: "empaque_ambar", origin: "Serra Grande, Bahía", stock: 320, unit: "unidades", minStock: 50, unitCost: 3.5, ethicallyCertified: true, squad: "Squad I (Admin)" },
  { id: "INV-005", name: "Etiquetas DTF UV Inî Rau (MUV Gráfica)", category: "etiqueta_dtf", origin: "MUV Gráfica", stock: 500, unit: "unidades", minStock: 100, unitCost: 1.2, ethicallyCertified: true, squad: "Squad I (Admin)" },
  { id: "INV-[#P01]", name: "Peça Reposição: Gerador Solar Inversor 3KW", category: "peca_reposicao", origin: "Serra Grande", stock: 2, unit: "unidades", minStock: 1, unitCost: 1800.0, ethicallyCertified: true, squad: "Squad VI (Infra)" },
  { id: "INV-[#P02]", name: "Filtro de Água Cerâmica de Alta Vasão", category: "peca_reposicao", origin: "Serra Grande", stock: 5, unit: "unidades", minStock: 2, unitCost: 120.0, ethicallyCertified: true, squad: "Squad VI (Infra)" },
];

export const INITIAL_FICHAS_TECNICAS: FichaTecnica[] = [
  {
    productId: "PROD-NISURAU-100ML",
    productName: "Preparação Nisurau (Óleo Resina 100ml)",
    ingredients: [
      { inventoryId: "INV-001", inventoryName: "Resina Sagrada Nisurau (Matéria-Prima)", quantityRequired: 0.1, unit: "litros" },
      { inventoryId: "INV-004", inventoryName: "Frascos Vidro Ámbar 100ml", quantityRequired: 1, unit: "unidades" },
      { inventoryId: "INV-005", inventoryName: "Etiquetas DTF UV Inî Rau (MUV Gráfica)", quantityRequired: 1, unit: "unidades" },
    ],
  },
];

export const INITIAL_ORDERS: ECommerceOrder[] = [
  {
    id: "PED-2026-9901",
    customerName: "Ana Clara Silva",
    customerEmail: "anaclara@example.com",
    items: [{ productId: "PROD-NISURAU-100ML", productName: "Preparação Nisurau (Óleo Resina 100ml)", qty: 2, unitPrice: 85.0 }],
    totalAmount: 170.0,
    status: "Pendente",
    date: "2026-08-11 19:40",
    inventoryDeducted: false,
  },
];

export const INITIAL_CERTIFICATIONS: EthicalCertification[] = [
  { productId: "PROD-NISURAU-100ML", productName: "Preparação Nisurau 100ml", squadOrigin: "Squad II (Mutum)", certifiedBy: "Pajé Hushahu Yawanawá / Squad VII", certificationDate: "2026-07-28", status: "APROVADO_COMERCIAL", notes: "Colheita ritual respeitando o ciclo da lua cheia na Aldeia Mutum." },
  { productId: "PROD-NOVO-EXTRATO", productName: "Extrato Sagrado Novo Lote", squadOrigin: "Squad II (Mutum)", certifiedBy: "Em Avaliação pelo Squad VII", certificationDate: "2026-08-10", status: "PENDENTE_ANALISE", notes: "Aguardando validação do Conselho de Pajés antes de entrar no e-commerce Inî Rau." },
];

export const INITIAL_MAINTENANCE: MaintenanceOrder[] = [
  { id: "MNT-01", assetName: "Sistema Fotovoltaico Solar (Cozinha Retiros)", location: "Centro de Retiros Serra Grande", issueDescription: "Inversor com oscilação de voltagem após tempestade", priority: "urgente", status: "aberto", partsRequired: [{ inventoryId: "INV-[#P01]", partName: "Gerador Solar Inversor 3KW", qty: 1 }] },
  { id: "MNT-02", assetName: "Filtro Central de Água Potável", location: "Aldeia Mutum / Maloca Principal", issueDescription: "Troca periódica de elementos filtrantes", priority: "media", status: "em_manutencao", partsRequired: [{ inventoryId: "INV-[#P02]", partName: "Filtro de Água Cerâmica", qty: 2 }] },
];

export const INITIAL_CEO_ADVICE: CEOAITaskAdvice[] = [
  { id: "CEO-01", priorityScore: 98, title: "Aprovação do Balanço DRE Trimestral", context: "Prazo fiscal do Instituto expira em 3 dias.", suggestedAction: "Revisar DRE com Squad V Adm/Legal e autorizar repasse de lucros para Mutum.", deadline: "14 de Agosto" },
  { id: "CEO-02", priorityScore: 92, title: "Reunião de Alinhamento com Cacica Mariazinha", context: "Expansão da capacidade de retiros Samakey.", suggestedAction: "Confirmar protocolo ético e datas da Dieta Samakey de Setembro.", deadline: "16 de Agosto" },
];

export const INITIAL_TRACEABILITY: TraceabilityRecord[] = [
  { batchId: "LOTE-2026-08A", productName: "Preparação Nisurau", harvestDate: "2026-07-28", pajeApprover: "Pajé Hushahu Yawanawá", locationOrigin: "Aldeia Mutum, Acre", currentLocation: "Lab Boticário (Serra Grande)", status: "Laboratório Boticário", qrCode: "QR-MUTUM-08A" },
  { batchId: "LOTE-2026-07B", productName: "Vitxy Rau", harvestDate: "2026-07-15", pajeApprover: "Cacica Mariazinha Nãiwēni", locationOrigin: "Aldeia Mutum, Acre", currentLocation: "Estoque Inî Rau E-Commerce", status: "Pronto P/ Venda", qrCode: "QR-MUTUM-07B" },
];

export const INITIAL_CUSTOMERS: CustomerProfile[] = [
  {
    id: "NIP-P01",
    name: "Ana Clara Silva",
    email: "anaclara@example.com",
    phone: "+55 11 98877-6655",
    role: "multiplo",
    totalSpent: 1250.0,
    totalDonated: 300.0,
    ltv: 1550.0,
    retreatsAttended: ["Dieta Samakey Inverno 2026", "Vivência Yawanawá"],
    purchasesCount: 4,
    anamnesis: {
      bloodType: "O+",
      allergies: ["Penicilina"],
      medications: ["Nenhum continuo"],
      spiritualIntention: "Alinhamento espiritual e conexão com as plantas medicinais da mata.",
      aiEmotionalScore: 92,
      aiNotes: "Excelente estabilidade emocional e intenção clara. Pronta para dieta intensiva.",
      isProtected: true,
    },
  },
  {
    id: "NIP-P02",
    name: "Carlos Eduardo Mendes",
    email: "carlos.mendes@example.com",
    phone: "+55 21 97654-3210",
    role: "comprador",
    totalSpent: 480.0,
    totalDonated: 0.0,
    ltv: 480.0,
    retreatsAttended: [],
    purchasesCount: 2,
    anamnesis: {
      bloodType: "A+",
      allergies: [],
      medications: [],
      spiritualIntention: "Uso da botica natural Inî Rau para bem-estar no cotidiano.",
      aiEmotionalScore: 85,
      aiNotes: "Perfil focado em uso profilático natural.",
      isProtected: true,
    },
  },
];

export const INITIAL_DRE: DREEntry[] = [
  { id: "FIN-101", date: "2026-08-01", description: "Vendas E-Commerce Inî Rau (Lote Nisurau)", type: "receita", amount: 4850.0, costCenter: "Inî Rau E-Commerce", squad: "Squad IV" },
  { id: "FIN-102", date: "2026-08-03", description: "Inscrições Dieta Samakey Agosto", type: "receita", amount: 14200.0, costCenter: "Dietas Samakey", squad: "Squad III" },
  { id: "FIN-103", date: "2026-08-05", description: "Impressão de Etiquetas DTF UV (MUV Gráfica)", type: "despesa", amount: 600.0, costCenter: "Inî Rau E-Commerce", squad: "Squad V" },
  { id: "FIN-104", date: "2026-08-08", description: "Frete & Logística Fluvial Acre -> Bahía", type: "despesa", amount: 1250.0, costCenter: "Instituto Mutum", squad: "Squad II", whatsappLogged: true },
];

export const INITIAL_TASKS: GlobalTask[] = [
  {
    id: "TSK-01",
    title: "Emitir Certificação Ética de Origem do Novo Lote Nisurau",
    project: "Certificação de Bioeconomia Mutum",
    assignee: "Pajé Hushahu / Squad VII",
    squad: "squad_7_instituto",
    priority: "urgente",
    status: "em_progresso",
    columnStatus: "review",
    dueDate: "2026-08-14",
    description: "Revisão dos rituais de colheita e validação do Conselho de Pajés antes da liberação e-commerce.",
    assignedAgents: ["antigravity", "hermes"],
    executionLogs: ["Iniciada análise do lote LOTE-2026-08A", "Validação ritual aprovada"],
    checklist: [
      { id: "chk-1", title: "Verificar ata da reunião do Conselho de Pajés", completed: true },
      { id: "chk-2", title: "Validar rastreabilidade de lote no laboratório", completed: true },
      { id: "chk-3", title: "Emitir selo verde de veto comercial ético", completed: false },
    ],
    comments: [
      { id: "c-1", author: "Pajé Hushahu", role: "Líder Espiritual", text: "Lote colhido sob a lua cheia com orações tradicionais.", createdAt: "2026-08-10 14:30", isAgent: false },
      { id: "c-2", author: "@antigravity", role: "Agente Orquestrador", text: "Registrado no Livro de Trazabilidade. Aguardando aprovação final.", createdAt: "2026-08-10 14:32", isAgent: true },
    ],
  },
  {
    id: "TSK-02",
    title: "Conferir Estoque Mínimo de Frascos Âmbar 100ml via QR Code",
    project: "Automação de Estoque Inî Rau",
    assignee: "Equipe Serra Grande",
    squad: "squad_2_mutum",
    priority: "media",
    status: "pendente",
    columnStatus: "todo",
    dueDate: "2026-08-15",
    description: "Efetuar escaneamento mobile do lote de vidros recebidos da MUV Gráfica.",
    assignedAgents: ["antigravity"],
    checklist: [
      { id: "chk-201", title: "Escanear QR Code das caixas de vidro", completed: false },
      { id: "chk-202", title: "Atualizar contagem de frascos no estoque", completed: false },
    ],
    comments: [
      { id: "c-201", author: "Gestão Mutum", role: "Operacional", text: "Caixas recebidas via frete fluvial sem danos.", createdAt: "2026-08-11 09:15", isAgent: false },
    ],
  },
  {
    id: "TSK-03",
    title: "Revisar Fichas de Anamnesis do Retiro Dieta Samakey",
    project: "Gestão de Huéspedes Retiros",
    assignee: "Therapeutic Board / Squad III",
    squad: "squad_3_retiros",
    priority: "alta",
    status: "pendente",
    columnStatus: "in_progress",
    dueDate: "2026-08-18",
    description: "Verificação das restrições médicas sob o Firewall Espiritual.",
    assignedAgents: ["claude"],
    checklist: [
      { id: "chk-301", title: "Conferir alergias alimentares dos 12 participantes", completed: true },
      { id: "chk-302", title: "Validar medicação contínua com conselho médico", completed: false },
    ],
    comments: [
      { id: "c-301", author: "@claude", role: "Agente Dev / Data", text: "Anamnese de Ana Clara Silva validada sem restrições graves.", createdAt: "2026-08-11 11:00", isAgent: true },
    ],
  },
  {
    id: "TSK-04",
    title: "Consolidação DRE Trimestral & Relatório Fiscal",
    project: "Governança & Adm Legal",
    assignee: "Equipe Financeira / Squad V",
    squad: "squad_5_adm_legal",
    priority: "alta",
    status: "pendente",
    columnStatus: "triage",
    dueDate: "2026-08-20",
    description: "Vinculação de facturas OCR e repasse financeiro para Aldeia Mutum.",
    assignedAgents: ["hermes"],
    checklist: [
      { id: "chk-401", title: "Extrair facturas via OCR", completed: false },
      { id: "chk-402", title: "Calcular repasse do fundo sagrado Mutum", completed: false },
    ],
  },
  {
    id: "TSK-05",
    title: "IA Priorização de Agenda CEO & Repasse Semanal",
    project: "Governança CEO",
    assignee: "Ana Castro / Squad I",
    squad: "squad_1_ceo",
    priority: "urgente",
    status: "em_progresso",
    columnStatus: "agent_executing",
    dueDate: "2026-08-13",
    description: "Sincronização Google Calendar API e envio de resumo executivo via WhatsApp.",
    assignedAgents: ["antigravity", "hermes"],
    executionLogs: ["Agentes sincronizando compromissos", "Gerando resumo de prioridades DRE"],
    comments: [
      { id: "c-501", author: "Ana Castro", role: "CEO", text: "Priorizar a reunião das 15h com os donantes do Instituto.", createdAt: "2026-08-12 08:00", isAgent: false },
    ],
  },
  {
    id: "TSK-06",
    title: "Manutenção Preventiva do Inversor Solar Serra Grande",
    project: "Infraestrutura Física",
    assignee: "Equipe Técnica Squad VI",
    squad: "squad_6_infra",
    priority: "alta",
    status: "concluido",
    columnStatus: "done",
    dueDate: "2026-08-10",
    description: "Troca do módulo inversor 3KW utilizando peça de reposição do inventário.",
    assignedAgents: ["antigravity"],
    executionLogs: ["Substituição concluída", "Baixa no estoque efetuada"],
  },
];

export const INITIAL_PASSIVE_LOGS: PassiveCaptureLog[] = [
  { id: "LOG-01", timestamp: "2026-08-11 14:22", source: "WhatsApp Audio", sender: "Jordão Pekûti", transcription: "Registrar despesa de 350 reais para combustível de barco na logística de coleta em Mutum.", parsedAction: "Lançamento Financeiro R$ 350,00 (Squad II)", status: "Processado" },
  { id: "LOG-02", timestamp: "2026-08-11 16:05", source: "WhatsApp Photo OCR", sender: "Recepção Serra Grande", transcription: "Factura MUV Gráfica - 500 etiquetas DTF UV Inî Rau", parsedAction: "Entrada de Insumo + R$ 600,00 despesa", status: "Processado" },
];
