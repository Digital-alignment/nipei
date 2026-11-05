# Plano — Equipes e Pontes (novembro 2026)

Aprovado por: Ashuan (05/11/2026) · Fase 1: em produção (v2.67.0) · Fase 2: em produção (v2.68.0) · Rotas a partir de `agent-os-nipei/source/`.

## Regras que valem para todas as fases

- **UI só com o design system** (`docs/design-system/DESIGN-SYSTEM.md`): componentes de `src/components/ds/` (Cartão, Abas pasta, Campo, Chip, Avatar, Linha do tempo, Seção recolhível, Estado vazio, Menu ⋯, cartão "Pinu sugere"). Padrão novo → primeiro uma seção em §10 do documento + entrada em `DECISOES.md`, depois o código. `npm run verificar:ds` e `npx tsc --noEmit` antes de cada deploy; conferir a 390 e 1440 px, escuro e claro.
- **Escritor único**: tarefas pelo `lib/tarefaNote.ts`; fichas e equipes pelas funções de `lib/v2/data.ts` (com `## Atividade`). Nada novo em `.jobs/` se for dado do negócio (vai no vault).
- **IA propõe, pessoa confirma**: as ferramentas novas do Pinu de escrita são cartões (`PROPOSTAS`).
- Cada fase termina com deploy, verificação em produção e atualização do `CLAUDE.md` (seção 3.9).

---

## Fase 1 — Pontes (contatos)

Tudo mexe na ficha de pessoa e no conceito de "contato", por isso vai junto.

1. **Equipe de contatos** — campo `contatos: true` na nota da equipe (Pontes; não fixar `equipe_5` no código). `ehContato(p)` = todas as equipes da pessoa são de contatos.
   - Sai de: `responsaveisPara` (responsáveis de tarefas), Participação, carga/equilibrar, lembrete de revisão, avisos e "Ver como".
   - Continua em: Pessoas (filtro "Contatos"), Organizar equipes (conta como organizada).
2. **Ficha de contato** (frontmatter da ficha em `Miembros/`): `ponte_tipo` (fornecedor · aliado possível · colaborador), `oferece` (lista curta), `empresa`, `como_conhecemos`, `vinculo` (pessoa nossa), `proximo_passo`, `reconectar_dias` (padrão 90). Conversas em `## Conversas` (data · quem · resumo) → `ultima_conversa` calculada.
   - UI: na ficha do contato a aba **Ponte** substitui Tarefas/Gestão: cartão com tipo (Chip), "oferece" (Chips), empresa, vínculo (Avatar), próximo passo; botão "Registrar conversa" (folha) → Linha do tempo das conversas.
   - Na equipe Pontes, aba **Contatos** no lugar de Tarefas: cartões em grade bento (selo Pontes na barra), busca + chips de tipo e de "oferece"; selo "reconectar" quando passou do prazo.
   - "Nova pessoa" com equipe Pontes já abre os campos de contato.
3. **Reconectar** — em Hoje, para o **vínculo**: pílula "Reconectar com X" (Chip) quando `ultima_conversa + reconectar_dias` venceu; toque → ficha, "Registrar conversa" zera.
4. **Pinu: "quem pode ajudar com…"** — ferramenta de leitura `pontes` (busca por palavras em `oferece`, empresa, tipo e conversas; devolve nome, o que oferece, vínculo e última conversa). Vale no painel, WhatsApp e MCP. Escrita: `registrar_conversa` como cartão.

## Fase 2 — A equipe se apresenta e recebe pedidos

Tudo na página da equipe e na lista `/equipes`.

5. **Sobre a equipe** — seções no corpo da nota da equipe: `## Propósito`, `## O que decide`, `## O que não faz`, `## Como pedir`. Aba **Sobre** (primeira aba) com os 4 blocos em Cartão; coordenação e gestão editam (Campo área de texto, folha). O Pinu recebe o "Sobre" de todas as equipes para dizer a quem levar uma pergunta (ferramenta `equipe` + contexto).
6. **Pedidos à equipe** — um pedido é uma **tarefa da equipe sem responsável** com `pedido: true` e `pedido_por` (reaproveita tarefas, avisos e atribuir).
   - Botão "Pedir algo" na página da equipe e no "+" de Hoje (escolher equipe → o que precisa → até quando). Qualquer membro com acesso.
   - Aba **Pedidos** (só coordenação/gestão vê a contagem): lista de pedidos novos com "Atribuir a…" e "Recusar" (diálogo com motivo → comentário + concluída). Quem pediu vê "Meus pedidos" com o estado.
   - Aviso WhatsApp para a coordenação quando chega pedido (mesma fila de avisos). Pinu: `pedir_equipe` (cartão).
7. **Saúde no cartão** — em `/equipes`, cada cartão ganha `Sparkline` de 8 semanas: % de tarefas concluídas no prazo por semana (calculado de `concluido_em` × `prazo`, sem registro novo; histórico desde 20/10). Seta de tendência + rótulo ("melhorando", "caindo").

## Fase 3 — Rotina da equipe

Tudo ligado a tempo (Agenda, Hoje, avisos).

8. **Reunião fixa** — `reuniao: { dia, hora }` na nota da equipe (editável na Configuração). Aparece na Agenda como evento recorrente da equipe; no dia, pílula em Hoje para membros e coordenação com link para a pauta ao vivo (`/equipes/[id]/reuniao`, que já existe); WhatsApp na véspera só para a coordenação.
9. **Procedimentos** — `Equipes/_procedimentos/<id>.md`: título, equipe, passos (checklist), gatilho: **manual**, **semanal (dia)** ou **antes de um evento (N dias/horas)**. Gera uma tarefa da equipe com o checklist (sem duplicar no mesmo período). Aba **Procedimentos** com Linha "Gerar agora". Primeiros: check-in de hóspedes (24 h antes), boas-vindas por WhatsApp (3 dias antes), prestação de contas pós-retiro (7 dias depois).
10. **Quem está esta semana** — cada pessoa marca a sua semana em Hoje (Segmentado por dia: no Santuário · remoto · fora; padrão = semana anterior). Guarda em `Presenca/AAAA-Wnn.md`. Na equipe, faixa da semana (padrão 10.5) com avatares por dia; a coordenação pode marcar pelos membros sem acesso.

## Fase 4 — Conhecimento da equipe e boas-vindas

Depende do "Sobre" (fase 2) e dos procedimentos (fase 3).

11. **Aba Conhecimento** (substitui "O que sabemos" na equipe): três blocos — fatos confirmados (o que já existe), **para revisar** desta equipe (link para `/conhecimento/revisar?equipe=`), e **o que a IA não soube** nos temas da equipe (perguntas de `sem-resposta` que batem com `temas`, com "Perguntar à comunidade"). Contagem de pendentes na aba para a coordenação.
12. **Boas-vindas à equipe** — ao entrar numa equipe (`addToEquipe`): cartão em Hoje "Bem-vindo à <equipe>" (Seção recolhível em cartão, some quando marcado) com Sobre, coordenação, procedimentos e os 10 fatos mais usados da equipe; WhatsApp curto com o link se a pessoa recebe avisos. Contatos (Pontes) não recebem.

---

## Fora deste plano

Caixa pequeno por equipe; "conhecimento crítico de uma só pessoa". Ficaram de fora na escolha de 05/11.

## Paralelismo

As fases 1, 2 e 3 mexem em arquivos diferentes na maior parte, mas todas tocam `lib/v2/data.ts`, `i18n.ts` e a página da equipe: rodar **em sequência** é mais seguro que em sessões paralelas. A fase 4 precisa da 2 e da 3.
