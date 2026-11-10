# Inventário de design — Nipëi OS v2 (2026-10-24)

Ponto de partida do design system. Retrato de **como a plataforma está hoje** (v2.58), tirado do código
(`agent-os-nipei/source/src/app/(v2)`, `components/v2`, `app/globals.css`): 85 arquivos de tela/componente, ~7.400 linhas.
Próximos passos: (1) Ashuan desenha os componentes da lista "O que desenhar" com as referências dele →
(2) criar o Design System no Claude (tipo "Design System") → (3) integrar no código (tokens + componentes) e
regra para que tudo novo use o sistema.

---

## 1. Fundamentos (como está)

### Cor
Não existem tokens: cada classe Tailwind repete a cor clara **e** a escura (`bg-white dark:bg-neutral-900`).

| Papel | Hoje | Usos |
|---|---|---|
| Base / neutros | escala `neutral` (50 fundo · 200/800 bordas · 500 texto secundário · 900/100 texto) | 1.528 |
| Ação principal | botão preto no claro / branco no escuro (`neutral-900` ↔ `white`) — **não há cor de marca** | — |
| Sucesso / feito / progresso | `green` (600 barras, 50/950 avisos) | 156 |
| Atenção / pendente / atrasado leve | `amber` | 136 |
| Erro / atrasado / destrutivo | `red` | 131 |
| Informação / tipo "fotos" | `sky` | 37 |
| Outros (tipos do Acervo) | `violet`, `pink`, `blue` | 20 |
| Cor de cada equipe (vem do vault) | Escritório `#2563eb` · Produção Yawanawa `#16a34a` · Guardiões `#d97706` · Manutenção `#7c3aed` | — |

Observações: o verde da Produção Yawanawa é igual ao verde de "sucesso"; o âmbar dos Guardiões é igual ao de "atenção".

### Tipografia
- A v2 usa **fonte do sistema** (`system-ui`, `.v2` em `globals.css`). O layout ainda baixa 5 fontes do Google da v1 (Outfit, Bricolage Grotesque, Manrope, JetBrains Mono, Caveat) que a v2 não usa.
- Tamanhos: `text-sm` (422) e `text-xs` (345) dominam; títulos `text-2xl` (10) / `text-xl` (10) / `text-lg` (9); tamanhos soltos `11px` (45) e `10px` (18) — pequenos demais no celular.
- Pesos: `medium` (131), `semibold` (81); quase nada de `bold`.
- Rótulos de seção: maiúsculas pequenas `text-xs uppercase tracking-wider text-neutral-500`.

### Forma, espaço, profundidade
- Cantos: `rounded-lg` (156), `rounded-full` (107), `rounded-md` (59), `rounded-xl` (48), `rounded-2xl` (7) — **4 raios para coisas parecidas**.
- Sombras: praticamente nenhuma (design plano); só o botão "+" e o assistente flutuante.
- Espaçamento: `gap` 1.5/2/3, padding de cartão `p-3`/`p-4`, seções `mb-4`…`mb-7`.
- Ícones: **lucide-react**, tamanhos 12–20.
- Tema: claro e escuro (classe `dark:`), segue o sistema.

### Duplicação (o que o design system resolve)
- **Cartão** redefinido em 16 arquivos (`const CARTAO`), 4 variantes.
- **Botão** redefinido em 12 arquivos, 8 variantes diferentes (preto/contorno; `rounded-md`/`lg`; `text-xs`/`sm`; 4 paddings).
- **Campo de texto** em 18 arquivos (`field`/`campo`), 3 variantes.
- **Chip/filtro**: componente `Chip` + 3 versões locais.

---

## 2. Componentes que existem hoje

### Base (`components/v2/ui.tsx`, usados em 32 telas)
| Componente | O que é |
|---|---|
| `Title` | Título da página + subtítulo cinza |
| `Section` | Rótulo em maiúsculas + conteúdo |
| `Card` | Cartão com link e barra de cor (equipe) |
| `Chip` | Pílula de filtro (ligada/desligada, bolinha de cor opcional) |
| `Progress` | Barra de progresso + % |
| `Empty` | Texto de "nada aqui" |
| `TaskRow` / `TaskList` | Linha de tarefa: círculo de concluir, título, prazo colorido, responsáveis, selos |
| `Avatar` | Foto ou iniciais |

### Ações e formulários
| Componente | Usos | O que é |
|---|---|---|
| `BotaoEnviar` | 23 | Botão que mostra "Enviando…" e se desativa |
| `ConfirmarBotao` | 2 | Botão que pergunta antes (remover) |
| `CopiarBotao` | 3 | Copiar texto/link com "Copiado" |
| `StatusBotao` | — | Círculo de concluir tarefa (funciona sem sinal) |
| `PrazoRapido` | 6 | Ícone de calendário → atalhos de prazo |
| `Upload` | 3 | Enviar arquivo / tirar foto (reduz a foto) |
| `NovaTarefaForm` | 1 | Formulário completo de tarefa (prioridade em chips, pessoas com busca, checklist) |
| `PerfilForm`, `AcervoForm`, `RespostaCampo`, `CadastroLote` | — | Formulários específicos |
| `EscolherEquipes` | 4 | Chips de equipe com caixa de seleção + nota interna |
| `LoteBarra` | 3 | "Selecionar" → caixas nas linhas + barra de ação em lote |

### Navegação e estrutura
| Componente | O que é |
|---|---|
| `Nav` | Menu lateral (computador, recolhível) + barra inferior (celular) com o assistente no centro |
| Cabeçalho (no `layout.tsx`) | Ícone do app + ícones Conhecimento, Acervo, Finanças, Painel, avatar, sair |
| `Abas` | Abas com contador (lembra a última) |
| `Recolhivel` + `AtalhosSecao` + `BotaoSecao` | Seção que abre/fecha e lembra; cartões-atalho com número |
| `FiltroAuto` | Filtros (selects) que se aplicam sozinhos |
| `LembrarVista` | Lembra a vista escolhida (Agenda) |

### Avisos e estados
| Componente | O que é |
|---|---|
| `ErroAviso` | Faixa vermelha com o erro de uma ação (✕ para fechar) |
| Faixa verde "ok" | Repetida à mão em 4 páginas |
| Faixa âmbar | Alertas (Conhecimento), "ver como" (barra superior) |
| `Offline` | Aviso sem conexão + fila de envio |
| `AutoRefresh` | Atualiza enquanto algo processa |
| `loading.tsx` | Tela de carregamento |

### Assistente e IA
| Componente | O que é |
|---|---|
| `AssistenteGlobal` | Botão flutuante + painel de conversa (mensagens, cartões de proposta "Confirmar/Cancelar", voz, sugestões) + `CampoAssistente` (campo na página Hoje) |
| `IAPanel` | Propostas da IA dentro da tarefa |
| `Md` | Texto em markdown (relatórios, atas) |

### Específicos de uma tela
`ArrastarAgenda` (arrastar tarefas no calendário), `Notificar` (mensagem por WhatsApp), `NotasInternas`, `Conexoes`, `Seguranca`, `ExportarGoogle`, `Imprimir`, `LoginForm`, `PulsoUso` (invisível).

### Padrões repetidos que **não** são componente (escritos à mão em cada página)
- Cabeçalho de página com botão de ação à direita (Acervo, Painel).
- Cartões de número (Agenda resumo, Painel Custos, Conhecimento atalhos).
- Faixa de semana (Hoje, Agenda) com dia selecionado e pontinho de evento.
- Barra de busca + linha de chips (Acervo, Conhecimento, Pessoas, Agenda).
- Tabelas (Painel: Tempo de uso, Custos, Acessos).
- Lista de atividade / linha do tempo (ficha da pessoa, tarefa, Painel Atividade).
- Pílula de contagem (abas, seções, chips).
- Botão flutuante "+" (Hoje, Agenda).
- Diálogo de confirmação: hoje usa o `confirm()` do navegador.
- Não existem: modal/diálogo próprio, toast, menu suspenso próprio, interruptor (switch), tooltip, skeleton de carregamento.

---

## 3. O que desenhar (em ordem)

### A. Fundamentos — primeiro, tudo depende disso
1. **Paleta**: neutros, **cor de marca/acento** (hoje não existe), cores de estado (sucesso, atenção, erro, info) separadas das **cores de equipe**; versão clara e escura.
2. **Tipografia**: família(s) (sistema ou fonte da marca), escala (título de página, título de seção, corpo, legenda, rótulo) — mínimo 12 px no celular.
3. **Raio, sombra, espaçamento**: 2–3 raios no máximo, 1–2 níveis de sombra, escala de espaço.
4. **Ícones**: manter lucide (tamanho e traço padrão).

### B. Componentes base — os mais usados
5. **Botão**: primário, secundário (contorno), fantasma, destrutivo; tamanhos P/M; com ícone; estados carregando/desativado.
6. **Campo**: texto, área de texto, select, busca, data; rótulo, ajuda, erro.
7. **Chip / pílula de filtro** (com contagem e cor de equipe) e **Badge** de contagem/estado.
8. **Cartão**: padrão, clicável, com barra de cor, de número (KPI).
9. **Avatar** e grupo de avatares.
10. **Aviso (banner)**: sucesso, atenção, erro, info — com fechar.
11. **Abas** e **Seção recolhível**.
12. **Barra de progresso**.
13. **Estado vazio** (com ação) e **carregando** (skeleton).

### C. Padrões compostos
14. **Linha de tarefa** (o componente mais visto da plataforma): concluir, prazo, prioridade, equipe, pessoas, selos.
15. **Cabeçalho de página** (título, subtítulo, ação).
16. **Barra de busca + filtros** (chips + selects).
17. **Faixa da semana / calendário**.
18. **Navegação**: menu lateral, barra inferior do celular, cabeçalho.
19. **Assistente**: botão flutuante, painel de conversa, bolhas, cartão de proposta, sugestões.
20. **Tabela** e **lista de atividade** (linha do tempo).

### D. Novos (faltam hoje e melhoram a usabilidade)
21. **Diálogo de confirmação** próprio (substitui o `confirm()` do navegador).
22. **Toast** ("Salvo", "Adicionado") no lugar das faixas verdes.
23. **Menu de ações** (⋯) para editar/remover sem poluir os cartões.
24. **Interruptor (switch)** para ligar/desligar (Painel → Funções, Conexões).

Para cada um: estados (normal, hover, pressionado, desativado, foco), claro **e** escuro, celular **e** computador.
