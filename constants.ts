import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Santo Daime (Ayahuasca)',
    technicalName: 'SACRAMENTO-DAIME-01',
    classification: 'Sacramento / Medicina de Alta Potência',
    images: [
      'https://images.unsplash.com/photo-1518005020250-68a9d042ad89?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Expansão da consciência, cura espiritual profunda, reconexão com o divino e limpeza emocional.',
    history: 'Uma medicina milenar das bacias amazônicas, o Santo Daime foi sistematizado no início do século XX pelo Mestre Irineu Serra.',
    composition: 'Proporção sagrada de Banisteriopsis caapi (Jagube) e Psychotria viridis (Rainha). O segredo do feitio garante a potência da luz.',
    safetyRequirement: 'Uso Ritualístico - Não Ingerir com Álcool ou Antidepressivos.',
    labels: [
      { key: 'Grau', value: '1º Grau, 2º Grau, 3x1, Mel, Real AP' },
      { key: 'Origem', value: 'Aldeia Mutum / Feitio Local (Bahia)' }
    ],
    audioSlots: [
      { id: 'a1', title: 'O Chamado do Jagube', author: 'Pajé Mutum' },
      { id: 'a2', title: 'A Força da Rainha', author: 'Mãe de Santo' },
      { id: 'a3', title: 'Canto de Abertura', author: 'Ancião Yawanawá' }
    ],
    isVisible: true
  },
  {
    id: '2',
    name: 'Uni (Uni da Floresta)',
    technicalName: 'MED-UNI-YAWANAWA',
    classification: 'Medicina Tradicional Yawanawá',
    images: [
      'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Clareza mental, purificação física e sintonia com os espíritos da floresta.',
    history: 'A medicina principal do povo Yawanawá, utilizada em cerimônias de cura e celebração da vida nas aldeias do Acre.',
    composition: 'Diferenciação técnica sagrada entre Uni Tradicional e Daime, envolvendo cipó e folhas da mata profunda.',
    labels: [
      { key: 'Tipo', value: 'Tradicional, Mel, Fermentado' },
      { key: 'Rezo', value: 'Intenção do Pajé ou feitor' }
    ],
    audioSlots: [
      { id: 'a4', title: 'A Origem do Uni', author: 'Tio Alberto' },
      { id: 'a5', title: 'Rezo da Cura', author: 'Pajé Biraci' },
      { id: 'a6', title: 'A Força das Águas', author: 'Anciã Putanny' }
    ],
    isVisible: true
  },
  {
    id: '3',
    name: 'Linha de Tônicos',
    technicalName: 'BIO-TONICO-VARIAVEL',
    classification: 'Fitoterápico / Suplemento Natural',
    images: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540324155974-7523202daa3f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Suporte sistêmico para órgãos específicos, imunidade e equilíbrio feminino.',
    history: 'Desenvolvido através da observação botânica e sabedoria popular transmitida por gerações de raizeiros.',
    composition: 'Base botânica variável (Jurubeba, Carqueja, Boldo) conforme a especificidade terapêutica.',
    safetyRequirement: 'Posologia Sugerida: 1 cálice (30ml) antes das refeições.',
    labels: [
      { key: 'Especificidade', value: 'Hepático, Próstata, Feminino, Imunológico' },
      { key: 'Laboratório', value: 'BioLab Forest Science' }
    ],
    audioSlots: [
      { id: 'a7', title: 'A Cura pelas Raízes', author: 'Raizeiro Local' },
      { id: 'a8', title: 'Protocolo de Uso', author: 'BioLab Tech' },
      { id: 'a9', title: 'Relato de Cura', author: 'Comunidade' }
    ],
    isVisible: true
  },
  {
    id: '4',
    name: 'Kanapa',
    technicalName: 'MED-KANAPA-01',
    classification: 'Medicina Yawanawá Específica',
    images: [
      'https://images.unsplash.com/photo-1501166617713-7d71493be392?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1508197149814-0cc02e8b7f74?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Equilíbrio energético e proteção espiritual através de banhos e rituais de limpeza.',
    history: 'Uma das medicinas menos documentadas, mantida viva através da tradição oral do povo Yawanawá.',
    composition: 'Raízes, folhas e cascas sagradas processadas de forma tradicional para uso tópico ou banho.',
    labels: [
      { key: 'Aplicação', value: 'Uso Tópico / Oral / Banho' },
      { key: 'Status', value: 'Padronização em curso' }
    ],
    audioSlots: [
      { id: 'a10', title: 'O Mistério de Kanapa', author: 'Pajé' },
      { id: 'a11', title: 'O Banho de Limpeza', author: 'Ancião' },
      { id: 'a12', title: 'Ensinamento Oral', author: 'Tio Jorge' }
    ],
    isVisible: true
  },
  {
    id: '5',
    name: 'Rapé (Tsunu / Cumaru)',
    technicalName: 'RAPE-PO-01',
    classification: 'Medicina de Sopro',
    images: [
      'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1515248137935-4bc18dd65a3d?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Aterramento, limpeza das vias respiratórias, foco e conexão com o elemento ar.',
    history: 'O rapé é uma medicina ancestral presente em quase todas as tradições amazônicas, usado para meditação.',
    composition: 'Nicotiana rustica (Tabaco) e cinzas de árvores sagradas (Tsunu, Murici, Cumaru).',
    labels: [
      { key: 'Feitor', value: 'Nome do aplicador/produtor' },
      { key: 'Variedade', value: 'Tabaco Corda / Moi' },
      { key: 'Cinza', value: 'Tsunu, Murici, Cumaru' }
    ],
    audioSlots: [
      { id: 'a13', title: 'O Sopro da Vida', author: 'Feitor Tsunu' },
      { id: 'a14', title: 'Conversa de Feitio', author: 'Tio Jorge' },
      { id: 'a15', title: 'A Força do Soprar', author: 'Ancião' }
    ],
    isVisible: true
  },
  {
    id: '6',
    name: 'Água e Tintura de Nisurau',
    technicalName: 'BANHO-NISURAU-01',
    classification: 'Banho / Limpeza Energética',
    images: [
      'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1516900448138-898720b936c7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1502989642968-94fbdc9eace4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Limpeza do campo áurico e perfumação do espírito com a essência da mata.',
    history: 'O Nisurau é uma planta Yawanawá utilizada tradicionalmente em ritos de beleza e limpeza espiritual.',
    composition: 'Planta Nisurau em infusão ou extração em álcool de cereais para maior conservação.',
    labels: [
      { key: 'Formato', value: 'Água de Cheiro / Tintura' },
      { key: 'Ingrediente', value: 'Planta Nisurau (Yawanawá)' }
    ],
    audioSlots: [
      { id: 'a16', title: 'O Cheiro da Mata', author: 'Anciã' },
      { id: 'a17', title: 'Ritos de Nisurau', author: 'Pajé' },
      { id: 'a18', title: 'Preparação do Banho', author: 'Comunidade' }
    ],
    isVisible: true
  },
  {
    id: '7',
    name: 'Kapum (Kambo)',
    technicalName: 'BIO-KAMBO-PALETA',
    classification: 'Secreção Animal / Bioativo Intenso',
    images: [
      'https://images.unsplash.com/photo-1515248137935-4bc18dd65a3d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Desintoxicação profunda, fortalecimento imunológico e renovação energética.',
    history: 'A vacina do sapo é uma secreção da Phyllomedusa bicolor, usada secularmente pelos povos amazônicos.',
    composition: 'Secreção seca de Phyllomedusa bicolor colhida de forma sustentável na mata virgem.',
    safetyRequirement: 'Uso Exclusivo por Aplicadores Habilitados. Perigo se ingerido.',
    labels: [
      { key: 'Coletor', value: 'Nome do Indígena' },
      { key: 'Pontos', value: 'Quantidade estimada na paleta' }
    ],
    audioSlots: [
      { id: 'a19', title: 'O Canto do Sapo', author: 'Pajé Kambo' },
      { id: 'a20', title: 'A Ciência da Vacina', author: 'Pesquisador' },
      { id: 'a21', title: 'A Força Verde', author: 'Ancião' }
    ],
    isVisible: true
  },
  {
    id: '8',
    name: 'Awara Vake',
    technicalName: 'MED-AWARA-VAKE',
    classification: 'Medicina Específica Indefinida',
    images: [
      'https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Propriedades em fase de catalogação técnica; uso tradicional em rituais específicos.',
    history: 'Medicina em processo de resgate cultural pelo Tio Jorge e Tio Alberto.',
    composition: 'Aguardando input técnico dos anciões sobre a natureza líquida/sólida do composto.',
    labels: [
      { key: 'Status', value: 'Catalogação Urgente' },
      { key: 'Referência', value: 'Tio Jorge / Tio Alberto' }
    ],
    audioSlots: [
      { id: 'a22', title: 'Resgate de Awara', author: 'Tio Alberto' },
      { id: 'a23', title: 'Memórias da Floresta', author: 'Tio Jorge' },
      { id: 'a24', title: 'Voz da Aldeia', author: 'Ancião' }
    ],
    isVisible: true
  },
  {
    id: '9',
    name: 'Anti-inflamatório',
    technicalName: 'BIO-ANTI-INFLAM-01',
    classification: 'Fitoterápico de Amplo Espectro',
    images: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540324155974-7523202daa3f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Combate a processos inflamatórios, dores articulares e musculares.',
    history: 'Composto de óleos potentes como Copaíba e Andiroba, usados por séculos como farmácia viva.',
    composition: 'Base de Óleo de Copaíba e Andiroba com ervas sinérgicas da região amazônica.',
    labels: [
      { key: 'Base', value: 'Copaíba / Andiroba' },
      { key: 'Lote', value: 'Sazonal' }
    ],
    audioSlots: [
      { id: 'a25', title: 'O Óleo Sagrado', author: 'Raizeiro' },
      { id: 'a26', title: 'Tradição da Cura', author: 'Anciã' },
      { id: 'a27', title: 'Uso Correto', author: 'Especialista' }
    ],
    isVisible: true
  },
  {
    id: '10',
    name: 'Sananga',
    technicalName: 'MED-SANANGA-LIQ',
    classification: 'Colírio Indígena',
    images: [
      'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&q=80&w=800',
    ],
    benefits: 'Limpeza do canal lacrimal, melhora da visão física e espiritual, combate ao "panema".',
    history: 'Extraída da raiz de plantas Apocynaceae, fundamental para a clareza do guerreiro.',
    composition: 'Sumo puro da raiz de Tabernaemontana sananho, mantido sob refrigeração rigorosa.',
    safetyRequirement: 'MANTER REFRIGERADO. Fermentação altera pH e segurança.',
    labels: [
      { key: 'Intensidade', value: 'Forte / Média / Suave' },
      { key: 'Extração', value: 'Data Crítica de Validade' }
    ],
    audioSlots: [
      { id: 'a28', title: 'Ver Além do Olho', author: 'Mestre Sanangueiro' },
      { id: 'a29', title: 'A Luz da Floresta', author: 'Anciã' },
      { id: 'a30', title: 'Cuidados da Raiz', author: 'Tio Alberto' }
    ],
    isVisible: true
  }
];
