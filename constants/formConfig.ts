export const FORM_CONFIG = {
  meta: {
    project: "Nipëihu Sanctuary",
    module: "Guardian Onboarding",
    version: "2.0",
    description: "Estrutura de dados para admissão e perfilamento profundo de membros."
  },
  ui_config: {
    welcome_message: {
      title: "O Chamado do Guardião",
      text: "Saudações, Guardião. Bem-vindo ao coração digital da nossa família Nipëihu. Você é um tesouro inestimável para nós. Este mapeamento busca harmonizar sua essência com o pulso do Santuário. Responda com o coração aberto; seus dados são sagrados e 100% confidenciais.",
      button_label: "Iniciar Jornada"
    }
  },
  sections: [
    {
      "id": "01_identidade",
      "title": "01 // Identidade e Raízes",
      "description": "Dados essenciais para sua cidadania no santuário.",
      "fields": [
        {
          "key": "profile_photo",
          "label": "Foto de Perfil",
          "type": "file_upload", 
          "required": true, // Added as requested
          "display_target": "header_avatar"
        },
        {
          "key": "nome_civil",
          "label": "Nome Civil",
          "type": "text",
          "required": true,
          "display_target": "header_profile_main"
        },
        {
          "key": "sobrenome",
          "label": "Sobrenome",
          "type": "text",
          "required": true,
          "display_target": "header_profile_sub"
        },
        {
          "key": "nome_yawanawa",
          "label": "Nome Yawanawa ",
          "type": "text",
          "placeholder": "Se houver",
          "display_target": "profile_badge"
        },
        {
          "key": "data_nascimento",
          "label": "Data de Nascimento",
          "type": "date",
          "required": true,
          "display_target": "admin_demographics"
        },
        {
          "key": "nacionalidade",
          "label": "Nacionalidade",
          "type": "text",
          "display_target": "admin_demographics"
        },
        {
          "key": "doc_id",
          "label": "Documento de Identificação (CPF ou Passaporte)",
          "type": "text",
          "required": true,
          "display_target": "secure_vault_legal"
        },
        {
          "key": "endereco_residencia",
          "label": "Direção Atual de Residência",
          "type": "text_area",
          "display_target": "admin_logistics"
        },
        {
          "key": "contatos",
          "type": "group",
          "label": "Canais de Conexão",
          "fields": [
            { "key": "email_pessoal", "label": "E-mail Pessoal", "type": "email" },
            { "key": "email_nipeihu", "label": "E-mail Nipëihu (se houver)", "type": "email" },
            { "key": "telefone", "label": "Telefone Móvel", "type": "tel" },
            { "key": "whatsapp", "label": "WhatsApp", "type": "tel" }
          ],
          "display_target": "contact_card"
        },
        {
          "key": "title_emergencia",
          "label": "Contato de Emergência",
          "type": "section_title"
        },
        {
          "key": "emergencia",
          "type": "repeater",
          "label": "Em Caso de Emergência (Guardiões Externos)",
          "min_items": 1,
          "max_items": 2,
          "fields": [
            { "key": "nome_contato", "label": "Nome", "type": "text" },
            { "key": "parentesco", "label": "Vínculo/Parentesco", "type": "text" },
            { "key": "numero_contato", "label": "Telefone/Contato", "type": "tel" }
          ],
          "display_target": "emergency_modal"
        },
        {
          "key": "biometria_saude",
          "type": "group",
          "label": "Biometria e Segurança Vital",
          "fields": [
            { "key": "tipo_sanguineo", "label": "Tipo Sanguíneo", "type": "select", "options": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
            { "key": "alergias_condicoes", "label": "Alergias ou Condições Médicas Relevantes", "type": "textarea", "placeholder": "Ex: Alergia a picada de abelha, diabetes, hipertensão..." },
            { "key": "altura", "label": "Altura (cm)", "type": "number" },
            { "key": "peso", "label": "Peso (kg)", "type": "number" }
          ],
          "display_target": "medical_alert_system"
        }
      ]
    },
    {
      "id": "02_alma",
      "title": "02 // A Alma do Guardião",
      "description": "Detalhes sutis para honrar sua presença e celebrar sua vida.",
      "fields": [
        {
          "key": "cor_favorita",
          "label": "Sua Cor de Poder",
          "type": "color_picker",
          "display_target": "ui_theme_personalization"
        },
        {
          "key": "comida_favorita",
          "label": "Comida que Aquece o Coração",
          "type": "text",
          "placeholder": "Ex: Lasanha de berinjela, Moqueca...",
          "display_target": "kitchen_squad_notes"
        },
        {
          "key": "presente_perfeito",
          "label": "O Presente Perfeito",
          "description": "Dica para aniversários ou celebrações.",
          "type": "text",
          "display_target": "community_celebration_log"
        },
        {
          "key": "tamanho_roupa",
          "label": "Tamanho de Vestimenta",
          "type": "select",
          "options": ["PP", "P", "M", "G", "GG", "XG"],
          "display_target": "logistics_uniforms"
        },
        {
          "key": "memoria_ouro",
          "label": "Memória de Ouro",
          "description": "Um momento mágico que marcou sua vida no santuário (ou na vida, se for primeira vez).",
          "type": "textarea",
          "display_target": "profile_bio_highlight"
        },
        {
          "key": "trilha_sonora",
          "label": "Trilha Sonora da Vida",
          "description": "Música ou banda que define seu momento atual.",
          "type": "text",
          "display_target": "profile_music_widget"
        },
        {
          "key": "aroma_nostalgia",
          "label": "Aroma da Nostalgia",
          "placeholder": "Ex: Terra molhada, café fresco, palo santo...",
          "type": "text",
          "display_target": "sensory_profile"
        },
        {
          "key": "estacao_alma",
          "label": "Estação da Alma",
          "description": "Em qual clima você se sente mais potente?",
          "type": "select",
          "options": ["Verão (Fogo/Ação)", "Inverno (Introspecção/Calma)", "Primavera (Renascimento/Criação)", "Outono (Desapego/Transição)", "Chuva (Limpeza)"],
          "display_target": "profile_season_icon"
        }
      ]
    },
    {
      "id": "03_sincronia",
      "title": "03 // Sincronia Operacional",
      "description": "Alinhando sua energia com as necessidades do ecossistema.",
      "fields": [
        {
          "key": "status_vinculo",
          "label": "Status de Vínculo Atual",
          "type": "radio",
          "options": [
            "Visitante / Primeira vez",
            "Voluntário Temporário (Curto Prazo)",
            "Guardião Residente (Longo Prazo)"
          ],
          "display_target": "admin_role_badge"
        },
        {
          "key": "bateria_fisica",
          "label": "Nível de Bateria Física",
          "description": "Crucial para segurança e bem-estar no trabalho.",
          "type": "radio",
          "options": [
            "Alta Voltagem",
            "Fluxo Moderado",
            "Baixa Intensidade / Intelectual"
          ],
          "display_target": "task_allocation_algorithm"
        },
        {
          "key": "squads_interesse",
          "label": "Onde sua bondade deseja fluir? (Squads)",
          "description": "Selecione as frentes onde você gostaria de apoiar.",
          "type": "checkbox_group",
          "options": [
            "Guardiões da Terra",
            "Alquimia & Nutrição",
            "Zeladoria & Estrutura",
            "Hospitalidade & Acolhimento",
            "Espaço de Cura",
            "Comunicação & Tecnologia",
            "Administração & Fluxo"
          ],
          "display_target": "volunteer_matching"
        },
        {
          "key": "lideranca_vs_apoio",
          "label": "Preferência de Atuação",
          "type": "slider_range",
          "min_label": "Prefiro Receber Instruções",
          "max_label": "Confortável em Liderar/Ensinar",
          "display_target": "leadership_potential_graph"
        },
        {
          "key": "atividade_atual",
          "label": "Atividade Atual no Santuário",
          "description": "Descreva com detalhe o que você já está fazendo hoje (se aplicável).",
          "type": "textarea",
          "display_target": "current_status_log"
        }
      ]
    },
    {
      "id": "04_simbiose",
      "title": "04 // Simbiose de Crescimento",
      "description": "Se o teu projeto cresce, o Nipëihu ganha um parceiro mais forte.",
      "fields": [
        {
          "key": "projeto_paralelo",
          "label": "Projeto Paralelo (Sonho Pessoal)",
          "placeholder": "O que você está construindo? Estudos, arte, casa, negócio...",
          "type": "textarea",
          "display_target": "dream_incubator_file"
        },
        {
          "key": "como_nipeihu_ajuda",
          "label": "Como o Nipëihu pode nutrir esse sonho?",
          "type": "checkbox_group",
          "options": [
            "Mentoria / Aconselhamento",
            "Espaço Físico para Testes/Arte",
            "Divulgação na Rede",
            "Flexibilidade de Horário",
            "Apoio Espiritual"
          ],
          "allow_custom": true,
          "display_target": "support_needs_matrix"
        },
        {
          "key": "superpoder_oculto",
          "label": "Superpoder Oculto",
          "description": "Uma habilidade que poucos sabem que você tem (Ex: Malabarismo, Excel avançado, Costura, Tradução).",
          "type": "text",
          "display_target": "talent_discovery_db"
        }
      ]
    }
  ]
};
