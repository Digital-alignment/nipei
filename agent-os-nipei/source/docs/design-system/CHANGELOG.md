# Design system — CHANGELOG

Mudanças na implementação do design system (`DESIGN-SYSTEM.md`) na v2 do Nipëi OS. Decisões de desenho ficam em `DECISOES.md`.

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
