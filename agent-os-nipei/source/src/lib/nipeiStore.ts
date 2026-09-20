export type NucleusRole = "sagrado" | "comercial" | "transversal" | "soporte";

export type SquadId =
  | "squad_1_ceo"
  | "squad_2_mutum"
  | "squad_3_retiros"
  | "squad_4_vendas_mkt"
  | "squad_5_adm_legal"
  | "squad_6_infra"
  | "squad_7_instituto"
  | "super_user"
  | string;

export interface SquadRenameHistory {
  previousName: string;
  newName: string;
  changedAt: string;
  changedBy: string;
}

export interface MemberSquadAssignment {
  squadId: string;
  roleTitle: string;
  confirmationStatus: "APPROVED" | "PENDING_CONFIRMATION" | "REJECTED";
  isPrimary?: boolean;
}

export interface MemberCompanyAssignment {
  companyId: string;
  companyName: string;
  positionTitle: string;
}

export type MemberType =
  | "human_paje_cacique"
  | "human_executive"
  | "human_staff"
  | "ai_agent"
  | "external_collaborator";

export type ContractType =
  | "Pro-labore"
  | "Fijo"
  | "Variable"
  | "Caché"
  | "Comisión"
  | "Voluntario"
  | "Joint Venture"
  | "Híbrido";

export interface MemberProfile {
  id: string;
  name: string;
  nativeName?: string;
  avatar: string;
  type: MemberType;
  contractType?: ContractType;
  status: "APPROVED" | "PENDING_CONFIRMATION" | "REJECTED";
  hasMissingInfo: boolean;
  missingInfoDetails?: string;
  specialityOrLineage?: string;
  globalRole: "SUPER_USER" | "SQUAD_LEADER" | "OPERATOR" | "READ_ONLY" | "VETO_APPROVER";
  companyAssignments: MemberCompanyAssignment[];
  squadAssignments: MemberSquadAssignment[];
  responsibilities: string[];
  vaultPath?: string;
}

export interface SquadMeta {
  id: SquadId;
  code?: string;
  name: string;
  nucleus: NucleusRole;
  module: "Nipëi Flow" | "Nipëi People" | "Nipëi Brain" | "Cross-cutting";
  description: string;
  iconName: string;
  colorHex?: string;
  sortOrder?: number;
  level?: number;
  vetoPower?: "FULL_VETO" | "ETHICAL_REVIEW" | "NONE";
  leadMemberId?: string;
  coLeadMemberId?: string;
  assignedAgentIds?: string[];
  responsibilities?: string[];
  kpis?: string[];
  status?: "ACTIVE" | "ARCHIVED" | "DRAFT";
  renameHistory?: SquadRenameHistory[];
}

export const INITIAL_SQUADS: SquadMeta[] = [
  { id: "super_user", code: "SU-00", name: "Visão Consolidada (Super-Usuário)", nucleus: "sagrado", module: "Cross-cutting", description: "Acesso total consolidado a todos os Squads", iconName: "Crown", sortOrder: 0, vetoPower: "FULL_VETO", status: "ACTIVE" },
  { id: "squad_7_instituto", code: "SQ-07", name: "Squad VII — Instituto & Donadores", nucleus: "sagrado", module: "Nipëi People", description: "Articulação Mutum, Donantes & Certificação de Origem Ética (Veto Comercial)", iconName: "ShieldCheck", sortOrder: 1, vetoPower: "FULL_VETO", status: "ACTIVE" },
  { id: "squad_1_ceo", code: "SQ-01", name: "Squad I — Estratégia / CEO", nucleus: "comercial", module: "Nipëi Brain", description: "Governança, IA de Priorização de Agenda & WhatsApp Bot Conversacional", iconName: "Brain", sortOrder: 2, vetoPower: "NONE", status: "ACTIVE" },
  { id: "squad_2_mutum", code: "SQ-02", name: "Squad II — Produção Mutum", nucleus: "sagrado", module: "Nipëi Flow", description: "Bioeconomia, Trazabilidade Florestal, Fichas Técnicas & OCR/QR", iconName: "Package", sortOrder: 3, vetoPower: "ETHICAL_REVIEW", status: "ACTIVE" },
  { id: "squad_3_retiros", code: "SQ-03", name: "Squad III — Logística Retiros & Hospitalidade", nucleus: "comercial", module: "Nipëi Flow", description: "Saída QR no celular, CRM Hóspedes & Portal do Participante", iconName: "Calendar", sortOrder: 4, vetoPower: "NONE", status: "ACTIVE" },
  { id: "squad_4_vendas_mkt", code: "SQ-04", name: "Squad IV — Vendas, Mkt & Infra Tech", nucleus: "comercial", module: "Cross-cutting", description: "Baixa automática por Pedido Pago via Ficha Técnica & LTV Analytics", iconName: "ShoppingBag", sortOrder: 5, vetoPower: "NONE", status: "ACTIVE" },
  { id: "squad_5_adm_legal", code: "SQ-05", name: "Squad V — Adm / Legal / Financeiro", nucleus: "transversal", module: "Nipëi Brain", description: "Fechamento Financeiro DRE por Centro de Custo & Arquivo Fiscal OCR", iconName: "FileSpreadsheet", sortOrder: 6, vetoPower: "NONE", status: "ACTIVE" },
  { id: "squad_6_infra", code: "SQ-06", name: "Squad VI — Infraestrutura & Manutenção", nucleus: "soporte", module: "Nipëi Flow", description: "Chamados de Reparo vinculados ao Estoque de Peças de Reposição", iconName: "Wrench", sortOrder: 7, vetoPower: "NONE", status: "ACTIVE" },
];

export const SQUADS: SquadMeta[] = INITIAL_SQUADS;

export const INITIAL_MEMBERS: MemberProfile[] = [
  {
    id: "cacique_mariazinha",
    name: "Mariazinha Luísa Naiweni Yawanawá",
    nativeName: "Naiweni",
    avatar: "👑",
    type: "human_paje_cacique",
    contractType: "Pro-labore",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Primera mujer Cacique en la historia Yawanawá. Guardiana Espiritual Principal del Santuario Nipëihu. Experta en plantas medicinales de la Amazonía y Plano de Vida Yawanawá.",
    globalRole: "VETO_APPROVER",
    companyAssignments: [
      { companyId: "instituto_nipeihu", companyName: "Instituto Nipëihu", positionTitle: "Directora Espiritual" },
      { companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Cacique & Guardiana Principal" }
    ],
    squadAssignments: [
      { squadId: "squad_7_instituto", roleTitle: "Directora Espiritual & Veto Gate", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_2_mutum", roleTitle: "Supervisora Espiritual de Recolección", confirmationStatus: "APPROVED" }
    ],
    responsibilities: [
      "Sostener el contenedor de seguridad energético para ceremonias de curación profunda (Vekuxi)",
      "Supervisión espiritual del BioLab y custodia etnobotánica",
      "Validación de productos de bioeconomía e investigaciones científicas"
    ]
  },
  {
    id: "kenewma_yawanawa",
    name: "Kenewma Yawanawá",
    avatar: "✨",
    type: "human_paje_cacique",
    contractType: "Caché",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Hija de los Caciques Biraci Nixiwaka y Mariazinha. Primera joven y tercera mujer en completar la Dieta del Muka. Artista plástica y maestra de cantos sagrados (Saitis).",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [
      { companyId: "samakey", companyName: "Retiros Samakey", positionTitle: "Curadora Ceremonial" }
    ],
    squadAssignments: [
      { squadId: "squad_3_retiros", roleTitle: "Curadora Ceremonial & Alma del Retiro", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_7_instituto", roleTitle: "Portadora de Saitis & Integración", confirmationStatus: "APPROVED" }
    ],
    responsibilities: [
      "Dirección de ceremonias de UNI y procesos de dieta espiritual Muka",
      "Curaduría artística y talleres de cantos sagrados (Saitis)",
      "Consultas de integración espiritual 1 a 1"
    ]
  },
  {
    id: "jordao_pekuti",
    name: "Jordão Pekûti de Melo e Souza",
    nativeName: "Pekûti",
    avatar: "🌿",
    type: "human_executive",
    contractType: "Pro-labore",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Último alumno iniciado del Pajé Tatá. Guardián de las historias milenarias (Shenipahu). Más de una década en diálogo intercultural y proyectos indígenas.",
    globalRole: "SUPER_USER",
    companyAssignments: [
      { companyId: "nipei_os", companyName: "Nipëi OS Global", positionTitle: "CEO & Cofundador" }
    ],
    squadAssignments: [
      { squadId: "squad_1_ceo", roleTitle: "CEO & Líder Estratégico", confirmationStatus: "APPROVED", isPrimary: true }
    ],
    responsibilities: [
      "Visión macro y gestión de líderes de todas las Squads",
      "Relaciones institucionales globales y estatutos",
      "Conducción de sesiones de integración 1 a 1 y estudio de oraciones (Ruawakî)"
    ]
  },
  {
    id: "paulo_roberto",
    name: "Paulo Roberto",
    avatar: "👔",
    type: "human_executive",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Gobernación interna y gestión operativa ejecutiva.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [
      { companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Director Adjunto" }
    ],
    squadAssignments: [
      { squadId: "squad_1_ceo", roleTitle: "Director Adjunto / Gobernador Interno", confirmationStatus: "APPROVED", isPrimary: true }
    ],
    responsibilities: [
      "Asistencia a la dirección general y rendición de cuentas interna",
      "Filtro de decisiones críticas para proteger al CEO del trabajo cotidiano"
    ]
  },
  {
    id: "rodrigo_andrade",
    name: "Rodrigo Andrade",
    avatar: "⚖️",
    type: "human_executive",
    contractType: "Híbrido",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Abogado societario y gestor financiero especializado en estructuras legales e impuestos.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [
      { companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Head of Admin & Legal" }
    ],
    squadAssignments: [
      { squadId: "squad_5_adm_legal", roleTitle: "Jefe Administrativo y Jurídico", confirmationStatus: "APPROVED", isPrimary: true }
    ],
    responsibilities: [
      "Control de tesorería (Base 1), flujo de caja y categorización de costos",
      "Gestión de Cisão Patrimonial (CPF a CNPJ) y contratos privados"
    ]
  },
  {
    id: "tio_alberto",
    name: "Tio Alberto",
    avatar: "🪵",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Coordinación forestal en Aldeia Mutum (Acre).",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Gerente de Operaciones Acre" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Gerente de Operaciones Mutum", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Coordinador central en la selva (Acre), cosechas y emergencias forestales"]
  },
  {
    id: "chucu_xinan",
    name: "Chucu & Xinan",
    avatar: "🧪",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Destiladores Maestros de aceites esenciales Copaíba, Breu y Supá.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Destiladores Maestros" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Alquimistas Técnicos / Destiladores", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Extracción de aceites esenciales e hidrolatos con maquinaria de precisión"]
  },
  {
    id: "shinan_tech",
    name: "Shinan",
    avatar: "⚗️",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Destilación técnica y laboratorio de transformación biológica.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Destilador Técnico" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Destilador Técnico", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Apoyo técnico en laboratorio de transformación en Acre"]
  },
  {
    id: "tio_jorge",
    name: "Tio Jorge",
    avatar: "🌱",
    type: "human_paje_cacique",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Consultor etnobotánico ancestral y custodio de tabúes rituais.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "instituto_nipeihu", companyName: "Instituto Nipëihu", positionTitle: "Consultor Ancestral" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Consultor Ancestral & Botánico", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Garantizar cumplimiento de rezos, ciclos lunares y crecientes del río en recolección"]
  },
  {
    id: "samu_qa",
    name: "Samu",
    avatar: "🔬",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Control de calidad de laboratorio estéril e inventario.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Gerente QA Laboratorio" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Gerente de QA y Laboratorio", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Esterilización de vidriería, higiene y embotellado estéril"]
  },
  {
    id: "iza_bete_recoleccion",
    name: "Izá, Bete y Equipo Recolección",
    avatar: "🧺",
    type: "human_staff",
    contractType: "Variable",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Recolección sostenible de biomasa en selva primaria.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Recolectores Forestales" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Recolectores Forestales Rotativos", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Recolección de biomasa primaria pagada por kg"]
  },
  {
    id: "carla_farmaceutica",
    name: "Carla",
    avatar: "💊",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Farmacéutica responsable de formulaciones Inî Rau en BioLab Bahía.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Farmacéutica Responsable" }],
    squadAssignments: [{ squadId: "squad_10_biofarmacia", roleTitle: "Resp. Biofarmacia y Calidad", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Formulación, estandarización y esterilización de aceites y tinturas en Bahía"]
  },
  {
    id: "fani_fanny",
    name: "Fani (Fanny)",
    avatar: "📦",
    type: "human_staff",
    contractType: "Híbrido",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Distribución física de botica y CRM/Hospitalidad en retiros.",
    globalRole: "OPERATOR",
    companyAssignments: [
      { companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Logística Embalaje" },
      { companyId: "samakey", companyName: "Samakey", positionTitle: "Guardiã da Experiência" }
    ],
    squadAssignments: [
      { squadId: "squad_10_biofarmacia", roleTitle: "Especialista en Empaquetado & Etiquetado", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_3_retiros", roleTitle: "Hospitalidad & CRM (Guardiã Experiência)", confirmationStatus: "APPROVED" }
    ],
    responsibilities: ["Embalaje profesional, etiquetado, CRM anamnesis y recepción de huéspedes"]
  },
  {
    id: "bruna_retiros",
    name: "Bruna",
    avatar: "🗓️",
    type: "human_executive",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Gerente de retiros, Maestrina do Tempo y agenda global.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey Retiros", positionTitle: "Gerente de Agenda" }],
    squadAssignments: [{ squadId: "squad_3_retiros", roleTitle: "Gerente de Retiros & Agenda", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Gestión de Agenda Global (Base 2), coordinadores externos y auditoría SLA 7 días"]
  },
  {
    id: "shaina_sheina",
    name: "Shaina / Sheina",
    avatar: "🌍",
    type: "human_staff",
    contractType: "Comisión",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Traducción internacional y ventas directas en círculos de sanación EE.UU.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey Global", positionTitle: "Embajadora Internacional" }],
    squadAssignments: [
      { squadId: "squad_3_retiros", roleTitle: "Contacto Internacional & Traducción", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_9_internacional", roleTitle: "Agente de Reventa EE.UU.", confirmationStatus: "APPROVED" }
    ],
    responsibilities: ["Atención a grupos extranjeros, traducción ceremonial y ventas Inî Rau EE.UU."]
  },
  {
    id: "tuxi_shanupana",
    name: "Tuxi & Shanupãnã",
    avatar: "🔥",
    type: "human_staff",
    contractType: "Variable",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Preparación de la Shuhu sagrada y soporte ceremonial.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey", positionTitle: "Guardianes de Shuhu" }],
    squadAssignments: [{ squadId: "squad_3_retiros", roleTitle: "Guardianes de Soporte & Logística Física", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Preparación de Shuhu, transporte de equipaje, leña y fuegos ceremoniales"]
  },
  {
    id: "vini_ops",
    name: "Vini",
    avatar: "🛠️",
    type: "human_executive",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Gerente de Operaciones y mantenimiento preventivo ('El Amortiguador').",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS Bahía", positionTitle: "Gerente de Operaciones" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Gerente de Operações (Amortiguador)", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Coordinación de obras civiles, mantenimiento preventivo y órdenes Base 2"]
  },
  {
    id: "melo_sebastiao",
    name: "Melo (Sebastião)",
    avatar: "🧱",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Conocimiento tácito de redes hidráulicas y eléctricas subterráneas.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS Bahía", positionTitle: "Líder Infraestructura" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Líder de Infraestrutura / Memoria Biológica", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Mantenimiento pesado de redes subterráneas y transición a Consultor Técnico"]
  },
  {
    id: "nomashahu_tactico",
    name: "Nomashahu",
    avatar: "👁️",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Coordinador táctico de almacén e inventario de rapé sagrado.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Coordinador Táctico" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Subgerente / Ojo Táctico", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Control de almacén, logística inmediata e inventario de rapé sagrado"]
  },
  {
    id: "iury_civil",
    name: "Iury",
    avatar: "🔨",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Carpintería, pintura y reparaciones estructurales civiles.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Guardián Mantenimiento Civil" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Guardián de Mantenimiento Civil", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Reparaciones estructurales, pintura y mantenimiento de activos"]
  },
  {
    id: "jailton_sistemas",
    name: "Jailton",
    avatar: "⚡",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Operación de generadores, bombas de agua y tableros eléctricos.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Guardián Sistemas Críticos" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Guardián de Sistemas Críticos (Energía/Agua)", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Operación de generadores solares, bombas de agua y tuberías"]
  },
  {
    id: "gerson_fuego",
    name: "Gerson",
    avatar: "🪵",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Logística de leña para cocinas y fuegos ceremoniales.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Guardián Fuego & Recursos" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Guardián de Logística de Recursos", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Suministro de leña ceremonial, jardinería y carga pesada"]
  },
  {
    id: "rafaela_zeladoria",
    name: "Rafaela",
    avatar: "🧹",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Preparación de habitaciones nivel hotelero e higiene Shuhu.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey", positionTitle: "Líder Zeladoria" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Líder de Limpeza e Zeladoria", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Higiene, acondicionamiento de habitaciones nivel hotelero y Shuhu"]
  },
  {
    id: "maico_mantenimiento",
    name: "Maico",
    avatar: "🔧",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Auxiliar de sistemas hidráulicos y eléctricos.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Apoyo Mantenimiento" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Apoyo de Mantenimiento", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Auxiliar en sistemas hidráulicos, eléctricos e infraestructura"]
  },
  {
    id: "jenny_cacau_voluntarias",
    name: "Jenny & Cacau",
    avatar: "🤝",
    type: "external_collaborator",
    contractType: "Voluntario",
    status: "PENDING_CONFIRMATION",
    hasMissingInfo: true,
    missingInfoDetails: "Confirmación manual pendiente para verificar disponibilidad activa en próximo evento.",
    specialityOrLineage: "Apoyo en jornadas de trabajo intenso (mutirões).",
    globalRole: "READ_ONLY",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey", positionTitle: "Voluntarias Soporte" }],
    squadAssignments: [{ squadId: "squad_6_infra", roleTitle: "Soporte Táctico Móvil / Voluntarias", confirmationStatus: "PENDING_CONFIRMATION", isPrimary: true }],
    responsibilities: ["Apoyo en mutirões y picos de demanda durante eventos"]
  },
  {
    id: "rafael_sales_ai",
    name: "Rafael",
    avatar: "📈",
    type: "human_executive",
    contractType: "Variable",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Especialista en tráfico pagado, embudos de conversión e IA de ventas.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Head of Sales & AI" }],
    squadAssignments: [{ squadId: "squad_4_vendas_mkt", roleTitle: "Head of Sales & AI", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Operaciones de ingresos, tráfico pagado e integración de IA de ventas"]
  },
  {
    id: "ashuan_web",
    name: "Ashuan",
    avatar: "💻",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Diseño de e-commerce Inî Rau y narrativa visual de producto.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Especialista Web" }],
    squadAssignments: [{ squadId: "squad_4_vendas_mkt", roleTitle: "Especialista em Web e Conteúdo", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Presencia digital, diseño e-commerce y narrativa de productos"]
  },
  {
    id: "runuina_ax_developer",
    name: "Runuina-ax",
    avatar: "⚙️",
    type: "human_staff",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Arquitectura Supabase, RLS security y desarrollo Core Nipëi OS.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: "Lead Developer" }],
    squadAssignments: [{ squadId: "squad_4_vendas_mkt", roleTitle: "Desenvolvedor Principal & Tech Infra", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Construcción del sistema operativo Nipëi OS y arquitectura Supabase"]
  },
  {
    id: "julia_audiovisual",
    name: "Julia",
    avatar: "📹",
    type: "human_staff",
    contractType: "Híbrido",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Producción audiovisual de marketing y documentación etnobotánica.",
    globalRole: "OPERATOR",
    companyAssignments: [
      { companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Productora Audiovisual" },
      { companyId: "instituto_nipeihu", companyName: "Instituto Nipëihu", positionTitle: "Memoria Visual" }
    ],
    squadAssignments: [
      { squadId: "squad_4_vendas_mkt", roleTitle: "Productora Audiovisual & Marketing", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_7_instituto", roleTitle: "Documentación Botánica & Memoria", confirmationStatus: "APPROVED" }
    ],
    responsibilities: ["Contenido audiovisual para marketing y archivo documental del Instituto"]
  },
  {
    id: "diego_instituto",
    name: "Diego",
    avatar: "📜",
    type: "human_executive",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Gestión de proyectos de subvención (Base 5) y Jardim Escola.",
    globalRole: "SQUAD_LEADER",
    companyAssignments: [{ companyId: "instituto_nipeihu", companyName: "Instituto Nipëihu", positionTitle: "Gerente Institucional" }],
    squadAssignments: [{ squadId: "squad_7_instituto", roleTitle: "Gerente Institucional (Operador do Sagrado)", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Dirección ejecutiva del instituto sin fines de lucro y Jardim Escola"]
  },
  {
    id: "ana_tini_grant_writer",
    name: "Ana Tini",
    avatar: "📝",
    type: "external_collaborator",
    contractType: "Variable",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Redacción técnica de propuestas de subvención, ODS y métricas SROI.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "instituto_nipeihu", companyName: "Instituto Nipëihu", positionTitle: "Grant Writer" }],
    squadAssignments: [{ squadId: "squad_8_fundraising", roleTitle: "Especialista em Captação & Grant Writer", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Rastreo de convocatorias públicas/privadas y informes de impacto SROI"]
  },
  {
    id: "lynn_schauwecker",
    name: "Lynn Schauwecker",
    avatar: "🕊️",
    type: "external_collaborator",
    contractType: "Joint Venture",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Coproducción del evento Sacred Bridge en Menla (NY) con Tibet House US.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi Global", positionTitle: "Directora Alianzas Internacionales" }],
    squadAssignments: [{ squadId: "squad_9_internacional", roleTitle: "Directora de Alianzas Internacionales", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Coproducción ejecutiva de Sacred Bridge en Menla/NY e invitados VIP"]
  },
  {
    id: "angelique_txiva",
    name: "Angelique (Txivã)",
    avatar: "🇺🇸",
    type: "external_collaborator",
    contractType: "Comisión",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Ventas de retiros de alto valor en USD y almacenamiento de mercancías EE.UU.",
    globalRole: "OPERATOR",
    companyAssignments: [{ companyId: "samakey", companyName: "Samakey USA", positionTitle: "Agente Comercial USA" }],
    squadAssignments: [{ squadId: "squad_9_internacional", roleTitle: "Agente Comercial Internacional & Logística USA", confirmationStatus: "APPROVED", isPrimary: true }],
    responsibilities: ["Ventas de retiros en USD y gestión de stock exportado a EE.UU."]
  },
  {
    id: "ana_castro_human_api",
    name: "Ana Castro (Txiní)",
    nativeName: "Txiní",
    avatar: "🧬",
    type: "human_executive",
    contractType: "Variable",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "Puente entre las necesidades de Acre (Squad II), Bahía (Squad VII) y subvenciones (Squad VIII). 'Human API' / 'A Sinapse'.",
    globalRole: "SUPER_USER",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS Global", positionTitle: "Enlace Institucional Global" }],
    squadAssignments: [
      { squadId: "squad_1_ceo", roleTitle: "Sinapse & Enlace Institucional", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_7_instituto", roleTitle: "Investigadora Principal Etnobotánica", confirmationStatus: "APPROVED" },
      { squadId: "squad_8_fundraising", roleTitle: "Traductora de Proyectos Forestales", confirmationStatus: "APPROVED" }
    ],
    responsibilities: ["Traducir necesidades operativas de Acre al lenguaje científico y administrativo"]
  },
  {
    id: "sr_elias_consultor",
    name: "Sr. Elias",
    avatar: "🧔‍♂️",
    type: "external_collaborator",
    contractType: "Variable",
    status: "PENDING_CONFIRMATION",
    hasMissingInfo: true,
    missingInfoDetails: "Pendiente confirmar horas acordadas de consultoría técnica para duplicación de destilación.",
    specialityOrLineage: "Asesoría operativa para estructurar separación de cosecha y destilación.",
    globalRole: "READ_ONLY",
    companyAssignments: [{ companyId: "botica_ini_rau", companyName: "Botica Inî Rau", positionTitle: "Asesor Técnico Producción" }],
    squadAssignments: [{ squadId: "squad_2_mutum", roleTitle: "Asesor Técnico de Producción", confirmationStatus: "PENDING_CONFIRMATION", isPrimary: true }],
    responsibilities: ["Asesoramiento operativo para triplicar rendimiento de aceites esenciales"]
  },
  {
    id: "agente_antigravity",
    name: "@antigravity",
    avatar: "🤖",
    type: "ai_agent",
    contractType: "Fijo",
    status: "APPROVED",
    hasMissingInfo: false,
    specialityOrLineage: "AI Mastermind, Orquestador del Sistema y Auditor de Veto Gate Ético.",
    globalRole: "SUPER_USER",
    companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS Core", positionTitle: "AI Mastermind" }],
    squadAssignments: [
      { squadId: "squad_1_ceo", roleTitle: "AI Mastermind & Orquestrador", confirmationStatus: "APPROVED", isPrimary: true },
      { squadId: "squad_7_instituto", roleTitle: "AI Fiscal de Veto Gate & Certificação", confirmationStatus: "APPROVED" }
    ],
    responsibilities: ["Ejecución de tareas automatizadas, orquestación y auditoría de Veto Gate"]
  }
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
