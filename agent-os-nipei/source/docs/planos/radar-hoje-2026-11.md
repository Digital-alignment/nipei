# Plano — Radar em Hoje (novembro 2026)

Estado: **fase 1 aprovada e feita** (24/11/2026). Fases 2–4 depois de ver o uso. Rotas a partir de `agent-os-nipei/source/`.

## A ideia

Um ícone em Hoje abre o **Radar**: uma tela cheia, estilo "stories", com um cartão por coisa a fazer. Em cada cartão: o que é, de onde vem, e os botões para resolver ali mesmo — concluir, adiar, delegar, mandar ao Conhecimento, pedir ao Pinu. O último cartão fecha a sessão: "N feitas hoje" e os pontos da semana. É o jeito rápido de "passar o dia a limpo" sem abrir tarefa por tarefa.

Referência visual (imagens do Ashuan) é só ideia; o Radar segue o DS:

| Na referência | No Radar |
|---|---|
| Título serifado | Outfit 300 (`saudacao`) — o DS não tem serifa (regra 11) |
| Fundo pastel diferente por cartão | Cor **da equipe/projeto** misturada no fundo (`color-mix(var(--eq-*) 24%, var(--s1))`, como na Agenda), funciona no escuro e no claro; com contraste checado |
| Ilustração desenhada | Símbolo grande dos lotes 2/3 (`Selo simbolo2-NN`), já reservados "para ilustração" (§7.5) |
| Logo WHATSAPP / GMAIL | Rótulo em texto + ícone Nipëi (`mensagem`, `enviar`…) |
| Timer que avança sozinho | Não: avança ao tocar (direita/esquerda), deslizar ou setas; segmentos no topo só mostram onde está |
| Relógio (adiar) | Ícone `prazo` (ampulheta) |

Técnica: CSS scroll-snap nativo (mesmo padrão do Quadro de tarefas no celular), sem biblioteca nova. `IntersectionObserver` acende o segmento; foco preso, Esc fecha, setas navegam; `prefers-reduced-motion` já é global.

## O que já existe e entra direto

- Ações de tarefa (`app/(v2)/actions.ts`): `setStatusAction` (concluir, com fila offline), `prazoRapidoAction` (hoje/amanhã/+1 semana), `focoAction`, `atribuirAction` (delegar), `checklistAction`, `comentarAction`, `tarefaConhecimentoAction` / `tarefaAnexoConhecimentoAction` (→ Conhecimento), `fazerPorMimAction` (Hermes), `proporIAAction`.
- Listas de Hoje: `getFoco`, `ordenarAgora` (com selos "atrasada", "hoje"…), `feitasHoje`.
- Pinu: `abrirPinu({texto|preencher, atalho})`, `acoesPinuTarefa`, `CampoPinu`, todas as ferramentas (`ver_tarefa`, `acervo`, `gmail_enviar`, `enviar_whatsapp`, `adicionar_passos`, `mudar_prazo`, `criar_evento`, `atribuir`…).
- Outros itens com getter pronto: `agendaDoDia` (eventos/reuniões), `pedidosNovos` (pedidos às minhas equipes), fatos a revisar (`getFatos` + `podeRevisar`), propostas (`getPropostas`), entregas prontas do Hermes (`prontosPara`), comentários esperando minha resposta (`esperandoPor`).
- Regras que continuam: nada de IA ao abrir; toda mudança da IA é cartão confirmado; quem não pode editar não vê o botão (`can.editTarefa`).

## Fase 1 — Radar das minhas tarefas (sem IA)

1. **DS primeiro**: §9.x "Tela cheia" (o DS ainda não tem folha/sheet — fecha o pendente do §14), §10.x "Radar" (anatomia, cor por equipe, símbolo, ações, cartão final), DECISOES, ICONES (adiar = `prazo`), pares de contraste das cores misturadas.
2. **Entrada em Hoje**: ícone "Radar" com o número de cartões, na linha do resumo de pendências (Hoje continua limpo; nada novo no meio da página). Sem cartões → o ícone não aparece.
3. **Cartões** (ordem): foco do dia → atrasadas → de hoje → pedidos para mim sem prazo. Máx. 15.
4. **Cartão de tarefa**: rótulo (equipe · projeto, ou "PEDIDO DE <pessoa>"), título, descrição em 2 linhas + "Ver mais", passos `2/5` (tocáveis), anexos (com ⓘ Conhecimento), selo do motivo (atrasada 3 dias…).
5. **Ações de baixo**: ✓ concluir (anima e passa ao próximo) · adiar (amanhã / próxima semana / escolher) · ⋯ (abrir, editar, delegar, foco, enviar ao Conhecimento, comentar).
6. **Cartão final**: "N feitas hoje", pontos da semana (concluídas por dia, a partir de `concluidoEm` — função nova pequena), e "Fechar o dia" se tudo foi feito.

## Fase 2 — O Pinu dentro do cartão

1. **2 sugestões por cartão, sem IA**: função `sugestoesPinu(tarefa)` por regras — sem passos → "Dividir em passos"; tem `pedidoPor` ou outro responsável → "Escrever mensagem"; fala de PDF/arquivo/foto/link → "Achar o arquivo" (Acervo); fala de e-mail/responder → "Redigir resposta" (rascunho Gmail); atrasada ou sem data → "Planejar" (prazo/evento). Com teste.
2. **"Diga o que fazer" no cartão**: abre o Pinu já **preso à tarefa** — novo campo `pagina` no evento `nipei:assistente` (`/tarefas/<id>`), o servidor já entende "Esta tarefa" por ele. O Pinu abre por cima do Radar; ao fechar, volta ao mesmo cartão.
3. **"Fazer por mim"** no ⋯ (quem tem IA), com o estado "em andamento" no cartão.
4. Casos novos em `npm run teste:pinu` (cartão → sugestão → proposta certa).

## Fase 3 — Mais que tarefas

Cartões de outros tipos, cada um com suas ações:

| Tipo | Ações |
|---|---|
| Evento/reunião de hoje | Ver detalhes · "Preparar com o Pinu" (pauta) · avisar atraso (WhatsApp) |
| Pedido à minha equipe (coord.) | Atribuir a alguém · responder com o Pinu · recusar (motivo) |
| Entrega do Hermes pronta | Abrir · aprovar/concluir · mandar ao Conhecimento |
| Comentário esperando você | Responder ali mesmo |
| Fatos a revisar (gestão/referente) | Confirmar · descartar · corrigir (1 cartão com até 5) |

Filtro no topo (Tudo · Tarefas · Equipe) se passar de ~10 cartões.

## Fase 4 — Origem e propostas no próprio cartão (depois de ver o uso)

- **Canal da tarefa**: gravar `canal` ao criar (whatsapp, gmail, reunião, pinu, hermes) — hoje só dá para adivinhar pela atividade. Permite o rótulo "WHATSAPP/GMAIL" e "Responder" direto no fio certo.
- **Propostas do Pinu dentro do cartão** (confirmar sem abrir o painel), reaproveitando `decidirCartaoAction`.
- Se as regras da Fase 2 derem sugestões ruins: sugestões por IA sob demanda, guardadas por dia (como o Resumo do dia).
- Gestos extras: deslizar para cima = concluir.

## O que NÃO entra

- IA rodando ao abrir Hoje ou o Radar.
- Avanço automático por tempo.
- Ações sem permissão (o botão some, não fica desativado).

## Testes (cada fase)

`npm run verificar:ds`, `npx tsc --noEmit`, `npm run teste:pinu` (fase 2+), conferir a 390 e 1440 px, escuro e claro, teclado (Esc/setas/Tab), leitor de tela no cartão.
