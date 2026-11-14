# Design system — CHANGELOG

Mudanças na implementação do design system (`DESIGN-SYSTEM.md`) na v2 do Nipëi OS. Decisões de desenho ficam em `DECISOES.md`.

## 2026-11-14 — Finanças: primeiros passos (10.25)

- `/financas`: Cartão "Primeiros passos de Finanças" (`SecaoRecolhivel` em cartão + `BarraProgresso`) com 4 passos que se marcam sozinhos (contas, gastos fixos, orçamento do ano, primeiro extrato conciliado), aviso dos lançamentos de teste e "O que reunir antes"; some quando os 4 estão feitos.

## 2026-11-14 — Agenda e Tarefas no celular (10.1, 10.6, 10.6.1)

- Agenda, vista Dia: só as horas úteis e trechos vazios compactados ("10:00 – 22:00 · livre"), com "Ver o dia inteiro"; no celular o Botão "Novo evento" saiu (fica no "+").
- Tarefas: busca como campo no celular (não uma segunda lupa), abas Lista / Quadro (a aba Agenda saiu) com o seletor lista/grade na mesma linha, tarefa rápida no topo da Lista, linhas com foco e prazo no ⋯ no celular.
- `CabecalhoPagina`: grade `minmax(0,1fr)` (uma linha larga não estica mais o cabeçalho além da tela) e ações `w-full` no celular.

## 2026-11-14 — Cabeçalho do celular compacto e saudação mais baixa (10.10, 10.5.1)

- `app/(v2)/layout.tsx`: abaixo de `md`, cabeçalho de uma linha — ícone do app (leva a Hoje) + lupa (`BotaoBuscaPinu`, abre o Pinu), sino e avatar; o campo "Pergunte ao Pinu ou busque…" só no computador. Decisão em DECISOES.md.
- Hoje: no celular a data saiu da saudação para uma linha `meta` abaixo do nome.
- `next.config.ts`: indicador de desenvolvimento do Next desligado (cobria a barra e depois o avatar).

## 2026-11-14 — Hoje: agenda de hoje em linha do tempo e foco de amanhã (10.5.1)

- Agenda de hoje: lista hora · título (comunidade, reuniões fixas e Google), "Dia todo" primeiro, o próximo em acento, os que passaram em `t3`; os eventos de hoje saíram dos Chips.
- Foco de amanhã: no dia fechado, até 3 tarefas sugeridas (as de amanhã primeiro) e "Usar como foco de amanhã"; guardado à parte em `.jobs/foco/<pessoa>.json` (`amanha`), vira o Foco de hoje no dia seguinte.

## 2026-11-14 — Hoje: Organizar equipes em Pessoas e resumo por equipe (10.5.1)

- Hoje: o Cartão "Organizar equipes" saiu; fica um Chip "Organizar equipes N%" em "Equipe e gestão". `/pessoas` (gestão, sem filtro): Cartão com a barra de progresso, as contagens e o Botão "Organizar equipes" (o botão do cabeçalho só aparece quando não há pendências).
- Hoje: o Chip "N atrasadas · N sem responsável" virou um Chip por equipe com selo e cor (`tipo="equipe"`), um número só (atrasadas, senão sem responsável), que abre o Pulso filtrado.

## 2026-11-14 — Hoje: pendências sem cortar, "+" que não cobre, chip de novidades (9.1, 10.5.1)

- `components/v2/FilaPendencias.tsx`: os grupos de pendências quebram linha; no celular até 3 Chips + "+N" que abre o resto (antes rolavam de lado e o que passava da borda não se via).
- `MenuAcoes gatilho="criar"`: 48 px no celular (56 no computador) e, no celular, some enquanto a página desce e volta ao subir.
- Hoje: Chip "N novidades" (últimas 24 h, o mesmo número do sino) em "Para você", abre a aba Novidades.

## 2026-11-14 — Hoje: semana compacta, ações no ⋯ no celular, dar prazo às sem data (9.19, 10.3, 10.5, 10.5.1)

- `MenuAcoes`: itens com ação do servidor (`acao` + `campos`) e `soCelular`; o menu ⋯ agora é `fixed` junto ao botão (antes era cortado pelo `overflow-hidden` das listas arredondadas nas últimas linhas), abre para cima se não cabe embaixo e fecha ao rolar.
- `LinhaTarefa`: `extraSoComputador`; `TaskRow`: `acoesCelular` — em Hoje, no celular, foco e prazo vão para o ⋯ (Pôr/Tirar do foco, Prazo: Para hoje / Amanhã / +1 semana); no computador continuam os botões.
- Faixa da semana: semana vazia vira linha fina (pílulas de 44 px, dia + número), sem os 7 anéis vazios.
- Hoje: com 5+ tarefas sem prazo, Chip "N sem data · dar prazo" → `/hoje?triagem=1`, 3 por vez com as opções de prazo abertas (`PrazoRapido abertoInicial`) e "Pronto".

## 2026-11-14 — Barra do celular: rótulos e indicador suave (10.10)

- `components/v2/Nav.tsx` (barra do celular): cada item = ícone 22 px num indicador em pílula 56×32 + rótulo de 12 px; ativo = `ac-soft` + `ac-text` (antes: círculo de 56 px cheio de acento); orbe 64 → 56 px, círculo 84 → 76 px, pílula 72 → 68 px, sombra mais suave. Decisão em DECISOES.md; pendente "ampliar/melhorar" (§14) resolvido. Verificado a 390 px, escuro e claro.
- `next.config.ts`: o indicador de desenvolvimento do Next foi para o canto superior direito (em baixo ficava sobre a barra; produção não muda).

## 2026-11-14 — Hoje: resumo do dia, pendências em dois grupos e sinais de Finanças (10.5.1, 10.3)

- Abaixo da saudação, uma linha "N atrasadas · N para hoje · N eventos hoje" (ou "Nada pendente para hoje.").
- A fila única de Chips virou dois grupos com rótulo: **Para você** (eventos, depois por urgência) e **Equipe e gestão** (pedidos, alertas, Pulso e sinais de Finanças: caixa negativo, a pagar em 7 dias, reembolsos, categorias acima de 90%).
- `LinhaTarefa`: `pessoasSoComputador` — nas minhas tarefas, os Avatares dos outros responsáveis só aparecem a partir de `sm`.

## 2026-11-14 — Hoje mais direto (10.5.1)

- Ordem: as tarefas (semana, foco, abas) vêm logo depois das pendências e da missão; Primeiros passos, Onde estou e Organizar equipes foram para o fim. No celular a lista de tarefas começava a ~2.100 px e agora a ~360 px; a página caiu de ~2.800 para ~1.100 px.
- Organizar equipes começa fechado. Primeiros passos com ≤ 2 por fazer vira Chip nas pendências. A sugestão do Foco só aparece se trouxer algo fora da aba Agora. Saiu o campo do Pinu do fim (o do cabeçalho é o mesmo).

## 2026-11-14 — Revisão de Finanças no celular (10.1, 9.x, 10.25)

- `CabecalhoPagina`: as ações quebram linha (`flex-wrap`) em vez de sair da tela (o `html` corta o excesso; no celular "Importar" e "Contador" sumiam).
- `Campo`: `min-w-0` na raiz e na casca — num grid de 2 colunas, campos de data/mês alargavam a coluna além da tela.
- `Md`: tabelas dentro de `overflow-x-auto` (relatório mensal no celular).
- `/financas`: botões do cabeçalho e das vistas do mês em tamanho P; as vistas (Resultado, Orçamento anual, Relatório) numa linha própria abaixo do mês.
- Orçamento anual: chips dos meses com ícone de check, anel e foco visível (mesmo padrão de Escolher equipes). Resultado: "Mês anterior" só no computador. Simulador: botão "Salvar como orçamento" (cabe em 320 px).

## 2026-11-14 — Finanças: orçamento anual (10.25)

- `/financas/orcamento?a=&u=`: chips por unidade, Aviso de 90%, 3 Cartões `kpi` (receitas, despesas, previsão do fim do ano), Tabelas "Por categoria" (BadgeEstado `aviso` 90%) e "Mês a mês", `<details>` "Editar orçamento" (valor no ano + chips de marcar dos meses) e "Começar a partir de <ano−1>" (reajuste + `EnviarComConfirmacao`). Em `/financas`: Botão "Orçamento anual" e `meta text-warn` das categorias acima de 90%.

## 2026-11-14 — Finanças: separações (titular PJ/CPF, unidade, recurso com destino, natureza do lançamento) (10.25)

- Contas: Campos "Titular" e "Unidade padrão"; BadgeEstado `aviso` "CPF de X" na tabela.
- Lançamento (novo e ficha): Campos "Unidade" e "Recurso com destino"; na ficha, "Natureza no resultado". Lista: BadgeEstado `aviso` "conta pessoal".
- `/financas`: `meta text-warn` do que passou por contas de CPF no mês; Seção "Recursos com destino" (Tabela recebido · usado · saldo).
- Resultado: Chips de filtro por unidade (`?u=`) e a linha de CPF.

## 2026-11-14 — Finanças: resultado gerencial / DRE (10.25)

- `/financas/resultado?m=`: 3 Cartões `kpi` + Cartão `destaque` (resultado do período), Tabela "Demonstrativo" (este mês · mês anterior · acumulado do ano; totais em `font-semibold`, categorias recuadas em `meta`), `meta` com o ponto de equilíbrio e os pendentes, `<details>` "Natureza das categorias" com um Campo seleção por categoria. Entrada: Botão fantasma "Resultado" (ícone `tarefa`) ao lado de "Relatório do mês".

## 2026-11-13 — Finanças: acesso por pessoa e "Contador · em breve" (10.25)

- Interruptor "Finanças" em `/controle → Funções`; o item Finanças do menu segue a mesma regra.
- Cabeçalho de `/financas`: Botão fantasma M `desativado` "Contador · em breve" (sem ação).

## 2026-11-13 — Finanças: orçamento por evento e reembolsos (10.25)

- `/financas/evento?e=`: CabecalhoPagina com o nome do evento; sem orçamento, Aviso `info` com "Criar no simulador"; com orçamento, Tabela "Orçado × realizado" (diferença verde/vermelha, Aviso `atencao` quando o resultado previsto fica abaixo) + "Editar no simulador"; Tabelas de despesas por categoria e de participantes. O nome do evento em "Por evento" de `/financas` abre esta página; coluna "Orçado" com BadgeEstado.
- Simulador: Cartão "Orçamento do evento" (Campo evento com sugestões + Botão primário "Salvar como orçamento do evento").
- Reembolsos: Campo "Pago com dinheiro de" no lançamento novo e na ficha; Cartão "Reembolso" na ficha (Botão tonal "Reembolsado" com a conta, ou BadgeEstado "Reembolsado em"); BadgeEstado "a reembolsar" na lista; Seção "Reembolsos a fazer" em `/financas` agrupada por pessoa.

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
