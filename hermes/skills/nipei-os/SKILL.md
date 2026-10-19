---
name: nipei-os
description: "Ler e gerenciar as tarefas do Nipëi OS (os.nipeihu.app): listar, criar, mover de coluna, mudar prioridade e atribuir responsáveis."
version: 1.1.0
author: Digital Alignment
platforms: [linux]
required_environment_variables:
  - name: NIPEI_API_TOKEN
    prompt: "Token de API do Nipëi OS (NIPEI_API_TOKEN no .env do VPS)"
  - name: NIPEI_OS_URL
    prompt: "URL do Nipëi OS, ex.: https://os.nipeihu.app"
metadata:
  hermes:
    tags: [nipei, kanban, tarefas, tasks, santuario, equipes]
    category: productivity
    requires_toolsets: [terminal]
---

# Nipëi OS — tarefas

Use quando alguém pedir para ver, criar, mover ou atribuir tarefas do Nipëi OS / Santuário Nipeihu.
As tarefas vivem no vault (`Productivity/Tarefas/*.md`); a API é a única forma de mexer nelas.

**Toda chamada leva o token.** Sem ele a API responde `401 Não autenticado`.

```bash
AUTH="Authorization: Bearer $NIPEI_API_TOKEN"
```

## Listar tarefas

```bash
curl -s -H "$AUTH" "$NIPEI_OS_URL/api/agent-kanban" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(t["id"], "|", t.get("columnStatus"), "|", t.get("priority"), "|", t.get("assignee"), "|", t["title"]) for t in d["tasks"]]'
```

São ~250 tarefas: filtre (grep / python) antes de responder, nunca despeje a lista inteira.

## Criar, atualizar, atribuir

Tudo vai para `POST $NIPEI_OS_URL/api/venu/kanban-action` com `{"action": ..., "payload": {...}}`.

```bash
# Criar — só "title" é obrigatório; mande sempre "equipe" (sem ela a tarefa aparece "sem equipe")
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"create","payload":{"title":"Comprar chip telefônico","equipe":"equipe_1","responsaveis":["jordao_pekuti"],"prazo":"2026-11-05","priority":"alta","description":"..."}}'

# Mover / mudar prioridade — idOrTitle aceita o id (task_001) ou parte do título
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"update","payload":{"idOrTitle":"task_001","column":"in_progress","priority":"media"}}'

# Atribuir a uma pessoa (id da ficha em Miembros/) e/ou agentes
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"assign","payload":{"idOrTitle":"task_001","assignee":"txiva","agents":["hermes"]}}'
```

- Campos de organização no `create` (opcionais, validados contra o vault — id inválido devolve erro com os válidos):
  - `equipe`: `equipe_1` Escritório / Gestão Geral · `equipe_2` Produção Yawanawa · `equipe_3` Guardiões · `equipe_4` Manutenção e Logística. Se omitida e houver `objetivo`, usa a equipe do objetivo.
  - `responsaveis`: lista de ids das fichas em `Miembros/` (ex.: `["adair","txiva"]`).
  - `projeto`: id em `Projetos/` — `financeiro` | `inirau` | `juridico` | `santuario`.
  - `objetivo`: id em `Objetivos/` (ex.: `obj_2026_acervo`, `obj_2026_mutiroes`, `obj_2027_eventos`).
  - `prazo`: data `YYYY-MM-DD`.
- `priority`: `urgente` | `alta` | `media` | `baixa`
- `column`: `triage` | `todo` | `in_progress` | `review` | `done` | `archived`
- Resposta: `{"success": true, "task": {...}, "message": "..."}`. Se `success` for `false`, repita o `error` para a pessoa; não invente que deu certo.

## Regras

- Confirme com a pessoa antes de mover tarefas para `done`/`archived` ou de atribuir em massa.
- Use `idOrTitle` com o **id** sempre que possível: busca por título pode pegar a tarefa errada.
- Nunca mostre o valor de `NIPEI_API_TOKEN` em mensagens.
