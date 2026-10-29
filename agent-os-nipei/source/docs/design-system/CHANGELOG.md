# Design system — CHANGELOG

Mudanças na implementação do design system (`DESIGN-SYSTEM.md`) na v2 do Nipëi OS. Decisões de desenho ficam em `DECISOES.md`.

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
