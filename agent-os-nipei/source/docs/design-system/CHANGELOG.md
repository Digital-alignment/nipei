# Design system — CHANGELOG

Mudanças na implementação do design system (`DESIGN-SYSTEM.md`) na v2 do Nipëi OS. Decisões de desenho ficam em `DECISOES.md`.

## 2026-11-11 — Finanças: simulador de preço por retiro (10.25)

- `/financas/simulador`: base em um evento (`FiltroAuto` num formulário próprio, para trocar a base reencher os números), formulário GET (Botao `type="submit"`), 4 Cartões kpi + o Cartão destaque do preço sugerido, Aviso de prejuízo e Tabela "Cenários" (linha simulada em negrito, marca de equilíbrio); "Custos do evento-base" num `<details>`. Entrada: Botão "Simular preço" na Seção "Por evento" de `/financas` e o nome de cada evento vira link para simular a partir dele.

## 2026-11-11 — Finanças: contas, conciliação e relatório mensal (10.25)

- `/financas/contas` (Tabela com saldo hoje e "conciliado até", Conciliar, Arquivar/Reativar, formulário em Cartão); Campo "Conta" em todo formulário de lançamento, nos fixos e na importação; Seção "Contas" em `/financas`. Importação com "Conta do extrato" (`FiltroAuto`, `?conta=`): BadgeEstado `feita` "já registrado" com link, `pendente` "pendente → pago", lista "No sistema, mas não no extrato" e a linha de saldo antes/depois. `/financas/relatorio?m=`: markdown (`Md`) imprimível + Google Docs; botão "Relatório do mês" ao lado do mês. Ícones provisórios: Contas = `abrir`, Relatório = `baixar` (ICONES.md).

## 2026-11-11 — Finanças: gastos fixos e previsão de caixa (10.25)

- `/financas/fixos`: Tabela dos gastos fixos (pausado = BadgeEstado `interna`, linha apagada), editar por `?editar=`, Pausar/Reativar e formulário em Cartão; custo fixo mensal no subtítulo. Em `/financas`: Botão "Gastos fixos" (ícone calendario), Seção "Previsão de caixa" com 3 Cartões kpi (Hoje, Em 30 dias, Em 60 dias; negativo em `text-err`) e Aviso `atencao` com o primeiro dia negativo; BadgeEstado `interna` "fixo" nos lançamentos gerados.

## 2026-11-11 — Finanças: a IA lê o recibo e lembrete semanal de pendentes (10.25)

- Foto/PDF de recibo mandado pela gestão ao WhatsApp é lido pela IA (valor, data, estabelecimento, itens) e vira proposta do Pinu com o comprovante anexado, sem precisar escrever o valor. Segunda-feira, WhatsApp à gestão com o que está a pagar e a receber. Só mensagens de texto, sem componente novo.

## 2026-11-11 — Finanças: comprovante pelo WhatsApp (10.25)

- Gestão manda a foto/PDF do recibo ao número do Nipëi: com legenda de gasto vai ao Pinu e vira o comprovante do lançamento confirmado; sem legenda, a pergunta do Conhecimento ganha "se for um comprovante, responda com o gasto"; "recibo"/"comprovante" sozinho anexa ao último lançamento sem comprovante das últimas 2 h. Respostas de texto no WhatsApp ("📎 Comprovante anexado…"), sem componente novo.

## 2026-11-11 — Finanças: registrar com o Pinu (10.25)

- Ferramenta `registrar_lancamento` do Pinu (só gestão; painel, WhatsApp e MCP): o mesmo cartão de proposta, "Despesa R$ X: descrição" + data · categoria · evento · participante · a pagar/a receber · projeto; o link do cartão feito abre a ficha do lançamento, cujo histórico diz "(via Pinu/WhatsApp/<app>)".

## 2026-11-11 — Finanças: ficha do lançamento, editar e comprovante (10.25)

- `/financas/[id]` (gestão): comprovante (foto em miniatura ou "Abrir PDF"; `Upload` com arquivo + foto), formulário de edição já preenchido, histórico em `LinhaDoTempo` (cada campo antes ▶ depois) e "Anular lançamento" com Diálogo; anulado = Aviso e nada editável. Na lista do mês e nos Pendentes a descrição é link para a ficha; ícone `imagem` quando tem comprovante. `Botao` com `target="_blank"` vira `<a>` comum (o `next/link` pré-carregava a rota do arquivo).

## 2026-11-11 — Finanças: importar planilha (10.25)

- `/financas/importar`: `Upload` ganhou `soArquivo` (sem botão de câmera); prévia em Tabela 10.8 com BadgeEstado por linha (erro, repetido, aviso, a pagar/a receber), projeto e evento padrão, "Importar N" e "Cancelar"; categoria editável por linha (Campo compacto de seleção, também no cartão do celular). Em `/financas`, linha "Importação de <data>" com "Desfazer" (`EnviarComConfirmacao` ganhou `perigoso` e `variante`).

## 2026-11-11 — Finanças: evento e participante (10.25)

- Lançamento com Evento (texto com sugestões por `<datalist>` nativo) e Participante. `/financas` ganha a Seção "Por evento" (todos os meses); o diagnóstico ganha "Por evento" e "Pagamentos dos participantes" (Tabela 10.8, a receber em `text-warn`). CSV, documento final, rascunho da IA e Pinu (`financas_resumo.por_evento`) levam os dois.

## 2026-11-11 — Finanças: pendentes, orçamento e CSV do período (10.25)

- KPIs de `/financas` sem centavos e em `md:text-3xl` (antes cortavam em 2 colunas). Lançamento pode ser "a pagar / a receber" (Interruptor no formulário, BadgeEstado na lista, bloco Pendentes com "Pago"/"Recebido"); fora dos totais até quitar. Diagnóstico → Revisão financeira: Tabela 10.8 Orçado · Real · Diferença por categoria (campos de orçamento para quem edita), linha de pendentes e "Baixar CSV do período". Categorias novas: "Hospedagem e limpeza" e "Marketing e divulgação".

## 2026-11-11 — Revisão do plano de trabalho (10.24)

- `Botao` aceita `download` (link comum para rotas que devolvem arquivo; antes o Next pré-carregava a exportação). Resumo sem avatares de iniciais (cortavam em 24 px; ficam os nomes), anel com rótulo acessível, resumo e Pedir respostas lado a lado a partir de 1024 px, linhas de Entregas com 44 px e respiro no hover, data do pedido sem dias passados.

## 2026-11-11 — Pedir respostas no plano de trabalho (10.24)

- Cartão "Pedir respostas" com quem recebe, quem não recebe e por quê, data limite e envio com Diálogo. Componente novo de apoio `components/v2/EnviarComConfirmacao.tsx` = Botão do sistema + `useConfirmar` (não um botão feito à mão).

## 2026-11-11 — Plano de trabalho no Acervo (10.24)

- Acervo ganha abas (Arquivos / Agenda work plan); a segunda, só gestão, mostra o diagnóstico da Lynn como checklist: anel do % geral, seções recolhíveis com barra e uma linha por pergunta (BadgeEstado + quem falta), entregas, exportar CSV e Markdown (EN). Só componentes existentes.

## 2026-11-05 — Pessoas: papel, referente, responsabilidades e "Completar fichas" (10.23)

- Ficha → Resumo começa pelo cartão Responsabilidades (papel, referente em Chips, coordena, lidera, objetivos com ritmo, procedimentos, presença da semana) com edição de papel e referente.
- `/pessoas/completar` (gestão): filtros do que falta, uma linha por pessoa com campos compactos, sugestão do Pinu (cartão `pinu`, Chip "sugerido"), "Salvar fichas" fixo no pé. Botão "Completar fichas" em /pessoas. Só componentes existentes.

## 2026-11-05 — Objetivos como resultados (10.22)

- `/objetivos` (Ativos / Fechados) com ritmo em BadgeEstado, responsável, prazo e avanço ("3 de 8 retiros", "2 de 5 marcos"); ficha com check-in (valor ou marcos), histórico e tarefas ligadas; formulário com "Como medimos" (Número / Marcos) sem JavaScript.
- Aba Objetivos do projeto em cartões com ritmo; pílula "Check-in" em Hoje. Só componentes existentes.

## 2026-11-05 — Projetos: portfólio, Sobre e "sem projeto" (10.21)

- `/projetos` agrupado por estado (BadgeEstado), com líder, equipes em Chip, Sparkline no prazo e "Parado há N dias"; "Novo projeto" e atalho "N tarefas sem projeto".
- Ficha do projeto: Sobre (Objetivo / Para quem / Como medimos) antes dos números; editar com `ProjetoForm`. Página `/projetos/sem-projeto` com sugestão do Pinu (cartão `pinu`, Chip "sugerido"). Só componentes existentes.

## 2026-11-05 — Conhecimento da equipe e Boas-vindas (10.19–10.20)

- Equipe: aba **Conhecimento** (para revisar com número display, o que a IA não soube nos temas da equipe, o que sabemos).
- Hoje: cartão `pinu` com barra da equipe "Bem-vindo à <equipe>" (Sobre, coordenação, procedimentos, fatos mais usados, "Abrir a equipe" / "Entendi"). Só componentes existentes.

## 2026-11-05 — Reunião fixa, Procedimentos e Presença (10.16–10.18)

- Configuração da equipe: cartão "Reunião fixa" (dia + hora); a reunião aparece na Agenda e em Hoje com a tinta da equipe e abre a pauta ao vivo.
- Equipe: aba **Procedimentos** (cartões com quando roda, passos, "Gerar agora", "Editar"; estado vazio), página de edição; faixa "Esta semana" na aba Membros e página "Marcar a semana".
- Novo componente de tela `SemanaPresenca` (7 pílulas que ciclam ao toque; no celular só o ícone). Hoje: cartão recolhível "Onde estou esta semana".

## 2026-11-05 — Sobre a equipe, Pedidos e Saúde (10.13–10.15)

- Equipe: aba **Sobre** (4 cartões; estado vazio com "Escrever"), aba **Pedidos** (linha com BadgeEstado, atribuir, recusar com motivo na linha), ícone "Pedir algo" no cabeçalho. Páginas `/equipes/[id]/sobre`, `/pedidos`, `/pedidos/novo` (toast "Pedido enviado").
- `/equipes`: Sparkline "No prazo · 8 semanas" + tendência em texto em cada cartão. Hoje: pílula de pedidos e item "Pedir algo a uma equipe" no "+". Só componentes existentes.

## 2026-11-05 — Contato (Pontes), seção 10.12

- `BadgeEstado` ganha o estado **aviso** (âmbar suave + ampulheta), usado em "Reconectar".
- Telas: equipe Pontes (`ContatosEquipe`: cartões de contato em grade, busca, chips de tipo, "Novo contato"), ficha do contato (abas Ponte · Perfil · Gestão, `PonteContato`), editar contato (`/pessoas/[id]/ponte`), pílula "Reconectar com X" em Hoje e cartão da equipe Pontes em `/equipes` (contatos e quantos para reconectar no lugar dos números de tarefas). Só componentes existentes.

## 2026-11-05 — Equipe Pontes

- Quinta equipe no design system: token `--eq-pontes` (antigo `--eq-reserva`, terracota) nos três blocos de `globals.css` e no `@theme`, selo `pontes` = `simbolo-39`, `EQUIPES_DS.pontes` e `equipe_5` em `components/ds/equipes.ts`. A página `/design` mostra a equipe.
- `ds-contraste.mjs` passa a conferir também `eq-pontes` como texto nos dois temas.

## 2026-10-29 — Menu lateral cabe em qualquer altura

- Itens do menu lateral do computador com altura `--altura-item-menu` (`clamp(28px, 4.6dvh, 44px)`, seção 10.10): antes eram 44 px fixos e, abaixo de ~800 px de altura (ex.: zoom 100% num notebook), Configurações e o orbe do Pinu saíam da barra. Conferido de 600 a 1000 px, recolhido e aberto, com o item do Painel.

## 2026-10-28 — Login sem rolagem, rótulo do campo e auditoria

- **Login**: logo = ícone do app (o mesmo do favicon); a página nunca rola (`h-dvh` + `overflow-hidden`) e se compacta pela altura com as variantes novas `baixa:`, `mini:` e `deitada:` (`globals.css`, seção 5.2); campos com ícone (pessoa, cadeado, mensagem). Conferido de 320×568 a 1440×900 e deitado (667×375, 844×390).
- **Campo**: rótulo passa de `t3` para `t2` (seção 9.5) — vale para todos os campos.
- Auditoria: BotaoEnviar exige ícone (29 botões viram Botao), /oauth/authorize no DS, 13 campos viram Campo/CAMPO_COMPACTO, raios iguais a token, cartões do Pinu com `Cartao variante="pinu"`, selo nas equipes de Pulso e Organizar.

## 2026-10-26 — v1: migração concluída (branch `design-system-v1`)

### Telas
- Navegação (menu lateral recolhido por padrão, barra do celular com o orbe no centro), cabeçalho com a busca do Pinu, `CabecalhoPagina` em todas as telas.
- Hoje, Tarefas (+ vista Quadro), Agenda (Dia / Semana / Mês), Pinu (nova interface do assistente).
- Acervo, Conhecimento, Pessoas, Equipes, Projetos, Objetivos, Finanças, Painel de controle, Diagnósticos, Login e as menores (editar tarefa, evento, Pulso, versão anterior, offline).
- Tema padrão volta a **escuro**; seletor de tema em Configurações.

### Componentes
- `components/ds/`: Botão (+ ícone, dividido), Campo (texto, título, área, busca, seleção, data, senha; `CAMPO_COMPACTO`), Chip, Badge, Avatar, Cartão, Aviso, Toast, Diálogo, Abas, Seção recolhível, Interruptor e linhas de configuração, Progresso, Estados (vazio, skeleton), Menu ⋯, Pinu (orbe, mini-anel, chip), Tema, Selo, Ícone.
- `components/ds/padroes/`: LinhaTarefa + GrupoTarefas, Tabela + Sparkline, LinhaDoTempo.
- Classe `alvo-toque`: área de toque de 44 px sem mudar o desenho.

### Limpeza final
- Apagados os embrulhos de compatibilidade da v2 (`Title`, `Card`, `Chip`, `Progress`, `Empty`, `Avatar`, `initials` em `components/v2/ui.tsx`; `components/v2/Abas.tsx`; `components/v2/Recolhivel.tsx`): 29 telas passam a importar direto de `components/ds`.
- Constantes locais de estilo (`CARTAO`, `BOTAO`, `ROTULO`, `field`, `campo`, `btn`, `sel`, `cel`…) trocadas por `Cartao`, `Botao`, `Campo` e `CAMPO_COMPACTO`.
- Faixa manual de "enviada" do Notificar virou `Toast`; a confirmação de envio usa o `Dialogo`.
- 7 variáveis CSS antigas sem uso removidas de `globals.css` (`--bg-hero`, `--bg-2`, `--glow`, `--personal-*`, `--empresa-*`).
- Revisão com checklist (Hoje, Tarefas, Agenda, Pinu, Painel; escuro e claro; 390 e 1440 px): alvos de toque abaixo de 44 px corrigidos (linhas de tarefa, chips do Pinu, resumos recolhíveis, linhas da Missão, links do cabeçalho da Agenda, campo do Pinu, avatar do celular).
- Corrigidas classes quebradas deixadas pela troca automática de constantes (`` `$"…"` `` em Diagnósticos, Equipes e Organizar equipes).

### Verificação
- `npm run verificar:ds` (lucide, `dark:`, cores literais, `text-[10/11px]`, `confirm/alert`, emoji, monospace + contraste dos tokens) roda antes de todo build, inclusive no deploy.

### Números (v2: `src/app/(v2)`, `src/app/login`, `src/components/v2`, `src/components/ds`; antes = v2.59.0)
| | Antes | Depois |
|---|---|---|
| Arquivos com lucide-react | 61 | 0 |
| Usos de `dark:` | 892 | 0 |
| Classes de cor literais do Tailwind | 2036 | 0 |
| Hex literais nas telas e componentes v2 | 5 | 4 (só o logo do Google, marcado `ds-permitido`) |
| Componentes duplicados (embrulhos v2 → ds) | 9 | 0 |
