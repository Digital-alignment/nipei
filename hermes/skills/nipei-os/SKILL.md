---
name: nipei-os
description: "Ler e gerenciar as tarefas do Nipëi OS (os.nipeihu.app): listar, criar, mover de coluna, mudar prioridade e atribuir responsáveis."
version: 1.0.0
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
# Criar — só "title" é obrigatório
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"create","payload":{"title":"Comprar chip telefônico","priority":"alta","project":"Ações imediatas","description":"...","assignee":"jordao_pekuti"}}'

# Mover / mudar prioridade — idOrTitle aceita o id (task_001) ou parte do título
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"update","payload":{"idOrTitle":"task_001","column":"in_progress","priority":"media"}}'

# Atribuir a uma pessoa (id da ficha em Miembros/) e/ou agentes
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$NIPEI_OS_URL/api/venu/kanban-action" \
  -d '{"action":"assign","payload":{"idOrTitle":"task_001","assignee":"txiva","agents":["hermes"]}}'
```

- `priority`: `urgente` | `alta` | `media` | `baixa`
- `column`: `triage` | `todo` | `in_progress` | `review` | `done` | `archived`
- Resposta: `{"success": true, "task": {...}, "message": "..."}`. Se `success` for `false`, repita o `error` para a pessoa; não invente que deu certo.

## Regras

- Confirme com a pessoa antes de mover tarefas para `done`/`archived` ou de atribuir em massa.
- Use `idOrTitle` com o **id** sempre que possível: busca por título pode pegar a tarefa errada.
- Nunca mostre o valor de `NIPEI_API_TOKEN` em mensagens.
