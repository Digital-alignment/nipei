# Ícones — Nipëi OS (lista de trabalho, 2026-10-26)

Levantamento do código v2 (`app/(v2)` + `components/v2`): **~95 ícones lucide diferentes** em 61 arquivos.
Muitos são repetidos com outro nome (ex.: `AlertTriangle` = `TriangleAlert`; 4 versões de "check").
Consolidado abaixo: **~72 ícones funcionais + ~14 símbolos de marca**.

Estilo decidido: **ancestral também dentro dos botões** · motivos de **natureza neutros** (sem imitar kene/grafismos tradicionais) · silhueta **cheia**, sem traço · nunca emoji.

## Formato técnico
- **SVG**, `viewBox="0 0 24 24"`, **um único `<path>` preenchido**, `fill="currentColor"`, sem `stroke`, sem textura, sem cor fixa.
- Área útil 20×20 (2 px de margem); detalhe mínimo e vão mínimo de **2 px** (para ler em 16–20 px).
- Nome em português, kebab-case (`calendario.svg`, `lixeira.svg`).
- Símbolos de marca (selos): mesmo formato, mas desenhados para **≥ 32 px** e com contêiner (círculo/squircle) e espaço negativo.
- No código: conjunto gerado como componentes React (`<Icone nome="calendario" />`), tamanho 16/20/24.

## Prioridade
- **P1** = aparece em quase toda tela (desenhar primeiro).
- **P2** = frequente.
- **P3** = raro / tela específica.

## A. Ações (botões)
| Nome | Hoje (lucide) | Prioridade |
|---|---|---|
| mais / criar | Plus | P1 |
| fechar | X | P1 |
| confirmar / feito | Check, CheckCheck | P1 |
| editar | Pencil | P1 |
| lixeira / remover | Trash2 | P1 |
| enviar | Send | P1 |
| buscar | Search | P1 |
| baixar | Download, FileDown | P2 |
| enviar arquivo | HardDriveUpload | P2 |
| copiar | Copy | P2 |
| link | Link2 | P2 |
| abrir fora | ExternalLink | P2 |
| atualizar | RefreshCw | P2 |
| desfazer / voltar estado | RotateCcw | P3 |
| repetir (recorrente) | Repeat | P3 |
| imprimir | Printer | P3 |
| anexar | Paperclip | P3 |
| câmera / foto | Camera | P2 |
| microfone / voz | Mic | P2 |
| filtrar | — (novo) | P2 |
| mais opções ⋯ | — (novo) | P1 |
| selecionar em lote | CheckSquare, Square | P3 |

## B. Navegação e estrutura
| Nome | Hoje | Prioridade |
|---|---|---|
| voltar | ArrowLeft | P1 |
| seta direita / avançar | ChevronRight | P1 |
| seta esquerda | ChevronLeft | P1 |
| abrir/fechar seção | ChevronDown | P1 |
| recolher / expandir menu | PanelLeftClose, PanelLeftOpen | P2 |
| sair | LogOut | P2 |
| tema escuro / claro / sistema | Sun (+ novos) | P2 |

## C. Estado e avisos
| Nome | Hoje | Prioridade |
|---|---|---|
| sucesso | CheckCircle2 | P1 |
| atenção | AlertTriangle, TriangleAlert | P1 |
| erro | XCircle | P1 |
| informação | — (novo) | P2 |
| bloqueado / privado | Lock | P1 |
| ver / ocultar | Eye, EyeOff | P2 |
| sem conexão | CloudOff | P2 |
| pendente / rascunho | CircleDashed | P2 |
| notificação / sem notificação | Bell, BellOff | P2 |
| som ligado / mudo | Volume2, VolumeX | P3 |
| erro técnico | Bug | P3 |
| saúde / pulso | HeartPulse, Activity | P3 |

## D. Objetos do sistema
| Nome | Hoje | Prioridade |
|---|---|---|
| tarefa / lista | ListChecks, ClipboardList | P1 |
| calendário / agenda | CalendarDays | P1 |
| prazo | CalendarClock, Clock | P1 |
| adicionar à agenda | CalendarPlus | P3 |
| pessoa | UserRound | P1 |
| pessoas / equipe | Users, UsersRound | P1 |
| remover pessoa | UserX | P3 |
| projeto | FolderKanban | P2 |
| pasta | Folder, FolderOpen | P2 |
| documento | FileText, ScrollText | P2 |
| planilha | Sheet | P3 |
| apresentação | Presentation | P3 |
| imagem | Image | P2 |
| vídeo | Video | P3 |
| música / áudio | Music | P3 |
| mensagem / conversa | MessageCircle, MessageSquare | P1 |
| e-mail | Mail | P3 |
| telefone / WhatsApp | Phone | P3 |
| caixa de entrada | Inbox | P3 |
| nota | NotebookPen | P3 |
| biblioteca / acervo | Library | P2 |
| conhecimento | Brain | P2 |
| objetivo / meta | Target | P2 |
| bandeira / prioridade | Flag | P2 |
| finanças / dinheiro | Wallet, Coins | P2 |
| gráfico / painel | BarChart3 | P2 |
| segurança | ShieldCheck, ShieldOff | P3 |
| chave / senha | KeyRound | P3 |
| ferramenta / manutenção | Wrench | P3 |
| balança / decisão | Scale | P3 |
| acordo | Handshake | P3 |
| formação | GraduationCap | P3 |
| direção / bússola | Compass | P3 |
| cor / aparência | Palette | P3 |
| interruptor | ToggleRight (vira componente Switch) | — |

## E. Símbolos de marca (selos, ≥ 32 px)
| Símbolo | Uso | Motivo sugerido (natureza neutra) |
|---|---|---|
| Assistente / IA | orbe, sugestões, propostas | semente / brilho (hoje Sparkles, Bot) |
| Hoje | menu | sol nascendo |
| Agenda | menu | lua / ciclo |
| Tarefas | menu | folha / broto |
| Conhecimento | menu | espiral |
| Acervo | menu | concha / cesto |
| Pessoas | menu | mão |
| Finanças | menu | semente / grão |
| Painel | menu | olho |
| Equipe Escritório / Gestão Geral | selo + cor teal | espiral / caminho |
| Equipe Produção Yawanawa | selo + cor violeta | planta / árvore |
| Equipe Guardiões | selo + cor magenta | pássaro |
| Equipe Manutenção e Logística | selo + cor ardósia | mão / pedra |
| Estado vazio / login | padrão de fundo | selos repetidos |

Total: **~72 funcionais** (≈ 22 P1 · 27 P2 · 23 P3) + **~14 selos**.

## Atualização 2026-10-26 — conjunto do Ashuan
- 63 símbolos separados em `icones/simbolos/` (ver `DECISOES.md` A8).
- Eles cobrem **os selos de marca (seção E)**. Os **funcionais (A–D)** não existem no conjunto → desenhar no mesmo estilo (traço grosso à mão, pontas arredondadas, pontos).

## Status 2026-10-26
- P1: ✅ 23 desenhados (`icones/funcionais/`). Ver biblioteca "Ícones Nipëi OS".
- P2: pendente · P3: pendente.
