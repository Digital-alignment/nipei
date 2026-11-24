# Plano — Pinu como base de Equipes (novembro 2026)

Estado: **fases 1 e 2 feitas** (fase 2 em 24/11/2026); (23/11/2026; equipes organizadas e Sobre escrito pelo Ashuan). Fases 2 e 3: depois de ver o uso. Rotas a partir de `agent-os-nipei/source/`.

## Por que Equipes, e por que depois do Sobre

Hoje, Agenda e Tarefas já têm o Pinu como base (DS 10.5.1, 10.6, 10.6.1): um bloco com atalhos da página, Chips "… com o Pinu" onde há trabalho a decidir, e o ⋯ das tarefas. Equipes é a página de quem **coordena**: ali as decisões são sobre outras pessoas (quem faz o quê, o que levar à reunião, quem está sobrecarregado). É onde o Pinu economiza mais tempo — e onde ele mais depende de contexto escrito: o **Sobre da equipe** (propósito, o que decide, o que não faz, como pedir), os **temas** e o **papel** de cada pessoa. Sem isso ele reparte e resume "no escuro". Por isso este plano vem depois da organização de pessoas/equipes e do Sobre.

## O que já existe e será reaproveitado

- Ferramentas de leitura do Pinu: `equipe` (Sobre, números, carga por membro, sem responsável, pedidos novos), `pulso_equipes`, `pessoas` (papel, referente, carga), `quem_sabe`, `buscar_tarefas` (por equipe, sem responsável, atrasadas), `objetivos`.
- Propostas: `atribuir`, `mudar_prazo`, `criar_tarefa`, `criar_evento`, `comentar`, `enviar_whatsapp`, `pedir_equipe`.
- Sem IA, já calculado: `balancear()` em `lib/v2/carga.ts` (sobrecarga/folga e sugestões de mover tarefas), `pauta()` em `lib/v2/reuniaoEquipe.ts` (desde a última ata: pendentes, feitas, atrasadas, próximos 7 dias, sem responsável).
- UI: `CampoPinu` (bloco com atalhos como `children`), `PedirPinu`, `acoesPinuTarefa` no ⋯, `DitarPinu`.
- Regra de sempre: nada de IA ao abrir a página; o Pinu só trabalha quando a pessoa toca; toda mudança é cartão.

## Fase 1 — o bloco do Pinu na equipe (`/equipes/[id]`)

Logo abaixo do cabeçalho da equipe, o `CampoPinu` com atalhos que mudam conforme quem olha:

| Atalho | Quem vê | O que o Pinu faz |
|---|---|---|
| **Como vai a equipe?** | todos os membros | Lê `equipe` + `objetivos` + `pulso_equipes`: 3–5 linhas — o que avançou, o que está atrasado, objetivos em risco, quem está sobrecarregado. Não propõe nada. |
| **Preparar a reunião** | coordenação/gestão | Usa a pauta (`pauta()`), propõe a pauta em tópicos e, se não houver reunião marcada, `criar_evento` "Reunião <equipe>". |
| **Repartir a carga** | coordenação/gestão | Usa `balancear()` + papel/referente de cada pessoa: propõe `atribuir` para as sem responsável e mudar de dono as de quem está sobrecarregado (máx. 8). |
| **Pedir algo à equipe** | quem não é da equipe | Preenche "Peça à <equipe>: " → `pedir_equipe` (o Pinu sugere prazo pelo "Como pedir" do Sobre). |

Skills novas em `lib/v2/skillsIA.ts` (valem também para Gemini/Claude pelo MCP; sobe `VERSAO_SKILLS`): **`equipe`** (Como vai a equipe?), **`reuniao`** (Preparar a reunião), **`carga`** (Repartir a carga). Cada uma recebe a equipe da página pelo contexto (`contextoPagina` já sabe em que equipe a pessoa está).

Duas ferramentas de leitura novas, para o Pinu não refazer contas que o código já faz (mesma decisão das finanças: "não refaça as contas"):
- `carga_equipe(equipe)` → o resultado de `balancear()` (cargas + sugestões), só para quem gere a equipe.
- `pauta_reuniao(equipe)` → o resultado de `pauta()` (sem textos de comentários, só títulos/prazos/responsáveis).

## Fase 2 — onde há trabalho a decidir

- **Aba Pedidos** (coordenação): Chip "Responder com o Pinu" — propõe, para cada pedido novo, atribuir a alguém ou uma resposta curta; recusar continua sendo à mão (recusa precisa de motivo da pessoa).
- **Aba Tarefas**: Chips "Repartir as sem dono" (no fim das sem responsável) e "Reprogramar com o Pinu" (nas atrasadas, só as que a pessoa pode editar) — os mesmos textos de Tarefas.
- **Aba Membros**: no ⋯ de cada pessoa (coordenação), "Mensagem com o Pinu" → `enviar_whatsapp` (respeita os limites do Notificar).
- **Página da reunião** (`/equipes/[id]/reuniao`): "Escrever a ata com o Pinu" — a pessoa cola/dita as anotações e o Pinu usa a skill Ata de reunião, propondo as tarefas dos encaminhamentos.

## Fase 3 — depois de ver o uso (opcional)

- **Resumo da equipe da semana** sob demanda, guardado por semana (como o Resumo do dia de Hoje), visível para todos os membros.
- **Lembrete à coordenação** antes da reunião fixa já existe (WhatsApp na véspera): incluir um link "Preparar com o Pinu".

## O que NÃO entra

- Nada automático sobre pessoas: o Pinu nunca atribui, recusa pedidos ou manda mensagem sem o cartão confirmado.
- Notas internas da gestão continuam fora (só a ferramenta `notas_internas`, só gestão, nunca copiadas para mensagens).
- Avaliação de pessoas ("quem trabalha mal") não é papel do Pinu: Participação mede entrega e uso, não qualidade.

## Testes (antes de cada deploy)

Casos novos em `scripts/pinu-teste.ts`: `equipe-como-vai` (lê `equipe`, não propõe), `equipe-reuniao` (lê `pauta_reuniao`, no máximo `criar_evento`), `equipe-carga` (só `atribuir`, ≤ 8; membro fora da coordenação não recebe a ferramenta), `equipe-pedido` (propõe `pedir_equipe`). Mais o de sempre: `npm run verificar:ds`, `npx tsc --noEmit`, conferir a 390 e 1440 px, escuro e claro.

## Antes de começar (do lado do Ashuan)

1. Pessoas e equipes organizadas (em andamento).
2. **Sobre** das 4 equipes escrito (`/equipes/[id]/sobre`, com "Rascunho com o Pinu").
3. Papel (`funcao`) e "referente de" nas fichas de quem coordena e de quem recebe tarefas (`/pessoas/completar`).
4. Reunião fixa marcada nas equipes que se reúnem (Configuração da equipe), para "Preparar a reunião" saber a data.

Depois disso: auditoria (`npm run auditar` em produção) e começar pela Fase 1.
