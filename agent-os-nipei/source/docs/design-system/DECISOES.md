# Decisões de design — Nipëi OS (arquivo de trabalho)

Registro das decisões tomadas na guia do design system. Base: `INVENTARIO.md` (2026-10-24).
Ao final, vira o documento final `DESIGN-SYSTEM.md` (em português).

---

## 0. Identidade

| Tema | Decisão |
|---|---|
| Idioma do documento final | Português |
| Personalidade | preciso · minimalista · moderno · futurista · natureza · cyberpunk |
| Identidade de marca | A plataforma terá **identidade própria**, separada da do Santuário Nipëihu (ainda não construída) |
| Usuários | Principalmente pessoas das equipes **no celular**; também muita gestão **no computador** → as duas telas são de primeira classe |
| Nome da identidade | **Nipëi OS** |
| Tema principal | **Escuro** (padrão) + versão **clara** completa (revisado em 2026-10-26; antes era claro) |
| Prioridade de tela | **Celular primeiro**; computador = painel amplo e fácil de navegar |
| Referências | (pendente) |

### Em aberto
- Tensão natureza × cyberpunk: direção visual (bio-tech escuro / solarpunk preciso / híbrido) — ainda não escolhida.

---

## A1. Paleta (definida pelo Ashuan)

| Escala | Valores (do mais claro ao mais escuro) |
|---|---|
| Light | `#FFFFFF` · `#DEDEDE` · `#B3B3B3` · `#858585` · `#424242` |
| Dark | `#424242` · `#303030` · `#1A1A1A` · `#141414` · `#0A0A0A` |
| Acentos | `#042608` (verde muito escuro) · `#2A5C0B` (verde floresta) · `#808F12` (oliva/lima) |

**Regra:** o texto sempre tem que ser bem legível. Mínimo WCAG AA: **4,5:1** para texto normal, **3:1** para texto grande (≥ 24 px, ou ≥ 18,66 px em negrito), ícones e bordas de componentes.

### Auditoria de contraste (calculada)
Tema claro, sobre `#FFFFFF`:
- `#424242`: 10,05 ✅ texto principal
- `#858585`: 3,69 ⚠️ **não serve para texto normal**; só texto grande, ícones e desativado
- `#B3B3B3`: 2,10 ❌ só bordas e divisores
- `#042608`: 16,33 ✅ · `#2A5C0B`: 7,97 ✅ · `#808F12`: 3,59 ⚠️ só elementos gráficos, não texto
- Sobre `#DEDEDE`: `#424242` 7,47 ✅ · `#2A5C0B` 5,93 ✅ · `#858585` 2,74 ❌

Tema escuro, sobre `#141414`:
- `#FFFFFF`: 18,42 ✅ · `#DEDEDE`: 13,69 ✅ · `#B3B3B3`: 8,79 ✅ · `#858585`: 4,99 ✅ texto secundário
- `#424242`: 1,83 ❌ só bordas
- `#808F12`: 5,14 ✅ **único acento legível no escuro**
- `#2A5C0B`: 2,31 ❌ · `#042608`: 1,13 ❌ (como texto e ícone, somem no escuro; servem como fundo)

Texto sobre os acentos (botões):
- `#042608` + texto branco: 16,33 ✅
- `#2A5C0B` + texto branco: 7,97 ✅
- `#808F12` + texto branco: 3,59 ❌ · + texto `#0A0A0A`: 5,52 ✅ → o botão oliva leva **texto escuro**

### Texto (decidido)
Pedido do Ashuan: textos principal e secundário **mais escuros** no claro.

| Papel | Claro | Contraste | Escuro | Contraste |
|---|---|---|---|---|
| Texto principal | `#1A1A1A` | 17,4 | `#FFFFFF` | 18,4 |
| Texto secundário | `#424242` | 10,05 | `#B3B3B3` | 8,8 |
| Ícone / desativado / texto grande apenas | `#858585` | 3,7 | `#858585` | 5,0 |
| Bordas e divisores | `#B3B3B3` / `#DEDEDE` | — | `#424242` / `#303030` | — |

Usa só valores da paleta, sem cinza novo. A diferença principal/secundário também vem de peso e tamanho.

### Acento por tema (decidido)
- **Claro**: ação = `#2A5C0B` com texto branco (7,97) · pressionado/ênfase = `#042608` (16,33) · `#808F12` só em elementos gráficos (barras, pontos), nunca texto.
- **Escuro**: ação = **`#C3D14A`** com texto `#0A0A0A` (**11,8**) · pressionado = `#A8B81A` (9,0) · `#808F12` vira tom de apoio (barras, pontos, bordas de foco). Motivo: com `#808F12` (5,5) o texto do botão não se destacava bem. · `#2A5C0B` / `#042608` como fundos tingidos (seleção, destaque).

### Cores de estado (decidido: sucesso usa os verdes da marca + vermelho, âmbar, azul)
Proposta de valores, todos verificados ≥ 4,5:1 como texto no próprio fundo do aviso:

| Estado | Claro: texto/borda | Claro: fundo | Escuro: texto/borda | Escuro: fundo |
|---|---|---|---|---|
| Sucesso | `#2A5C0B` | `#EEF3E8` (7,07) | `#C3D14A`* | `#1B2410` (9,6) |
| Atenção | `#8A5A00` | `#FBF3E4` (5,37) | `#E0A526` | `#2A2010` (7,3) |
| Erro | `#B3261E` | `#FBEAE9` (5,62) | `#FF6B5E` | `#2C1514` (6,14) |
| Info | `#1F5FAD` | `#E9F0F9` (5,55) | `#6FA8F0` | `#121D2B` (6,9) |

\* `#808F12` sobre `#1B2410` dá 4,48 (não passa); por isso o sucesso no escuro usa um oliva mais claro, derivado.
Status: **aprovado** (sem objeções na prévia).

### Cores de equipe (decidido: redesenhar, sem confundir com estados nem com a marca)
Evitar verde, vermelho, âmbar e azul. Proposta (barra/ponto = elemento gráfico, mínimo 3:1):

| Equipe | Claro | Escuro |
|---|---|---|
| Escritório / Gestão Geral | teal `#0F766E` | `#2BB3A6` |
| Produção Yawanawa | violeta `#6D4AB8` | `#A68CF0` |
| Guardiões | magenta `#A3306B` | `#E37AB0` |
| Manutenção e Logística | ardósia `#4F6475` | `#8FA6B8` |
| (alternativa) | terracota `#A3542A` | `#E08A5C` |

Todos passam 4,5:1 também como texto (claro sobre branco, escuro sobre `#141414`).
Status: **aprovado** (sem objeções na prévia; terracota fica de reserva).

---

## A2. Tipografia (definida pelo Ashuan)

- Famílias: **Google Sans** e **Outfit**. Nenhuma outra. **Nunca monospace.**
- Hierarquia feita pelo **peso** (Google Sans 400–700, Outfit 100–900), não por mais famílias.
- Link: https://fonts.google.com/share?selection.family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700|Outfit:wght@100..900
- Consequência: remover do layout as fontes da v1 que não serão usadas (Bricolage Grotesque, Manrope, JetBrains Mono, Caveat).
- **Outfit**: títulos e números grandes (KPI, contadores de destaque).
- **Google Sans**: corpo, botões, campos, rótulos, tabelas.
- Pesos: em definição (ver proposta abaixo).
- Pendente: escala de tamanhos (mínimo 12 px no celular); números em tabela (sem monospace → algarismos tabulares, se a fonte tiver).

### Pesos (decidido)
- **Display** (título de tela, números KPI, dias grandes): Outfit **200–300**, tamanho grande.
- **Títulos de seção e de cartão**: Outfit **600**.
- **Corpo**: Google Sans **400** · botões e rótulos: Google Sans 500–600.
- Escala de tamanhos: ajustar depois.

---

## A3. Forma, espaço, densidade

- **Brilho (glow)**: **leve**, só no orbe do assistente e em algum elemento que realmente precise (ver proposta "brilho = IA").
- **Sombras**: **plano**. Sem sombras; separação por bordas finas e diferença de fundo. Elementos flutuantes (menu, diálogo, botão "+") se destacam por borda + fundo mais claro/escuro.
- **Raios** (revisado 2026-10-26, após as referências): botões, chips, campos, abas e selos = **pílula** (`999px`); botões de ícone e avatar = **círculo**; cartões = **16 px** no celular / **12 px** no computador; elementos internos de cartão (mini-cartões, blocos) = 12 px. ~~4–6 px~~ descartado.
- **Densidade no computador**: **mais informação por tela** (tabelas e listas compactas). Celular mantém áreas de toque ≥ 44 px.

---

## A4. Estilo visual — análise das referências (2026-10-26)

Referências em `design/referencias/` (01 fitness-anel · 02 sono-hoje · 03 agenda-dias · 04 planning · 05 vendas-kpi).

### O que elas têm em comum
1. **Tipografia display fina e enorme**: títulos ("Planning", "Product Sales Performance"), datas (13, 14, 15) e números (90,744 · 7hr 32) em peso **fino (200–300)** e tamanho grande. A hierarquia vem do **tamanho**, não do negrito.
2. **Números em dois tons**: parte principal clara, parte secundária apagada (90 **,744** · 7 **hr** 32); unidade pequena ao lado do número.
3. **Formas arredondadas e "pílula"**: botões de ícone circulares, botões e campos em pílula, cartões com raio grande (~20–28 px).
4. **Superfícies em camadas**: fundo + cartão um tom acima; quase sem bordas e sem sombra. Separação por diferença de tom.
5. **Acento usado com economia**: só no "uma coisa importante" (dia ativo, faixa selecionada, barra em destaque, ação principal).
6. **Dado como protagonista**: anel/medidor grande, anéis de progresso por dia, barras arredondadas, faixas hachuradas/listradas (textura "tech").
7. **Ações por ícone**: fileiras de botões circulares só com ícone; texto só na ação principal.
8. **Navegação flutuante**: barra inferior em pílula, flutuando, com **orbe central** (assistente) — e menu radial no botão "+".
9. **Muito respiro** no celular; poucos elementos por tela; selos de contagem pequenos (ponto vermelho com número).

### Como isso mapeia no Nipëi OS
- **Hoje** ← ref 02: saudação + data, faixa da semana em círculos com %, cartão de sugestão do assistente (ícone ✦), "Tarefas do dia 1/4".
- **Agenda** ← ref 03: número do dia enorme e fino, eventos em linhas com ícone colorido + hora, "Sem eventos" discreto.
- **Painel / Custos** ← ref 05 e 04: KPI fino em dois tons, gráfico de barras com destaque, barra de ações com ícones circulares.
- **Tarefa / projeto** ← ref 01: anel de progresso; dias com anel parcial.
- **Nav** ← ref 01: barra flutuante com orbe do assistente no centro (já é a estrutura atual).
- **Botão "+"** ← ref 05: abre menu radial de criação.
- **Formulários em etapas** ← ref 04: seções numeradas, navegador de data ‹ ›, barra fixa inferior com resumo + ação.

### Conflitos (resolvidos em 2026-10-26)
- Raio → pílula + cartões 16/12 px.
- Tema → escuro principal, claro como versão completa.
- Brilho → leve, só orbe e elementos necessários.
- Densidade → ver referências de computador (A5).

### Segunda leva de referências (06–09)
06 linha-do-tempo · 07 tarefas-hoje · 08 calendario-fab · 09 cursos-bento.

O que acrescentam:
1. **Linha do tempo** (06): hora à esquerda, nó circular com ícone colorido na linha vertical, cartão à direita com título + duração + menu ⋯; cartão pode expandir com lista de itens e valores alinhados à direita; selos mini (letra em quadradinho colorido).
2. **Faixa da semana em pílulas verticais** (07): dia + número + ponto de evento; dia selecionado = pílula preenchida com o acento.
3. **Cartão de tarefa completo** (07): rótulo do projeto pequeno e cinza acima · título semibold · metadados em **chips-pílula** (prioridade, duração) · **grupo de avatares "+3"** · menu ⋯ · barra de progresso fina com % no marcador · "3 subtarefas".
4. **CTA principal largo em pílula com contorno** ("Adicionar tarefa +").
5. **Dois estilos de abas**: controle segmentado (Dia/Semana/Mês/Ano, 08) e abas sublinhadas com contador (09).
6. **Agenda** (08): título enorme fino + botão fechar circular; dias recolhíveis com data empilhada (MÊS / número) + divisor vertical + nome do dia + chevron; grade de horas com linha "agora"; eventos como pílulas com ícone + ponto de cor; bloco tingido para evento com horário.
7. **Botão "+" abre menu radial** com o conteúdo atrás escurecido (08, confirma 05).
8. **Grade bento** (09): cartões de tamanhos diferentes; **um único cartão preenchido com o acento** como destaque; cartões de número em 2 colunas (rótulo + parte em acento + número).
9. **Dentro do cartão**: tag-pílula ("Tutor X") no topo, título grande fino, linha de metadados embaixo.
10. **Nav inferior**: item ativo = círculo preenchido com o acento (07).

Reforça: display fino (200–300) para títulos de tela e números; **títulos de seção e de cartão em semibold** ("Today Calls", "UX Research"); raio de cartão ~12–20 px; botões, chips e campos em pílula; quase sem bordas; acento raro e forte.

Mapeamento adicional:
- **Linha de tarefa / Hoje** ← 07 · **Lista de atividade (pessoa, tarefa, Painel)** ← 06 · **Agenda (Dia/Semana)** ← 08 · **Painel e Pessoas** ← 09 (bento, cartões de número).


---

## A5. Computador — análise das referências (2026-10-26)

Referências: `desk-01-agenda-3colunas` · `desk-02-calendario-denso` · `desk-03-dashboard-ia` · `desk-04-dashboard-kpi`.

1. **Estrutura em 3 colunas** (desk-01): menu lateral · conteúdo principal · **painel de contexto à direita** (minicalendário + agenda do dia).
2. **Menu lateral** (desk-01, desk-03): logo; busca em pílula; grupos com rótulo pequeno em maiúsculas ("PRINCIPAL", "MAIS"); contador e grupo de avatares no item; botão "Criar" em pílula; Ajuda e links legais no rodapé; item ativo = pílula preenchida (com brilho leve no desk-03).
3. **Alternativa**: navegação superior em pílulas, ativa em acento (desk-04).
4. **Cabeçalho**: saudação grande e fina (nome em acento) + subtítulo; à direita, botões de ícone circulares + perfil; **campo do assistente no cabeçalho** ("Pergunte qualquer coisa", com microfone — desk-03).
5. **Grade bento de cartões** com **cabeçalho de cartão padrão**: [ícone em círculo] Título ······ [controles: segmentado, ⋯, ↗].
6. **Cartões de número (KPI)**: ícone · número grande · variação ("+42,8% vs. semana anterior"); **um único KPI preenchido com acento** (desk-04).
7. **Controles em pílula por todo lado**: abas segmentadas, períodos (1D 1S 1M 6M 1A), chips de filtro, "Baixar relatório" com contorno.
8. **Cartão de evento com barra de cor à esquerda** (desk-01) = o `Card` com barra de cor da equipe que já existe.
9. **Popover/modal** sobre o conteúdo (desk-01): fechar ✕, imagem, avatares, tag, chips de data/hora (hora em acento), duração com ícone.
10. **Gráficos**: barras hachuradas com a barra em destaque sólida + tooltip; área com linha-guia tracejada; **mapa de calor** com células hachuradas/sólidas. Hachura = textura "tech" recorrente.
11. **Lista com valores** (watchlist): ícone · nome + subtítulo · valor à direita + variação colorida.
12. **Brilho leve** aparece só em: item ativo do menu e cartão de IA ("Explore AI Insights") — reforça a ideia de "brilho = IA".
13. Densidade: mais colunas e cartões por tela, mas a **mesma linguagem** do celular (pílulas, cartões, display fino).

---

## A6. Menu lateral do computador (2026-10-26)

**Decidido:** navegação no computador = **menu lateral recolhível**, moderno e elegante.
Referências: `nav-01-trilho-fino` · `nav-02-dois-niveis` · `nav-03-hud` · `nav-04-recolhido-expandido`.

### O que as referências mostram
1. **Mesmo componente em dois estados** (nav-04): recolhido = trilho só com ícones; expandido = ícone + nome + contador em pílula.
2. **Contêiner flutuante**: o menu não encosta na borda; é um bloco arredondado com margem em volta (nav-01, nav-02, nav-04).
3. **Grupos separados por divisores finos**; no expandido, rótulo pequeno e apagado por grupo ("Projetos", "Status", "Histórico" — nav-02).
4. **Item ativo**: pílula com preenchimento sutil + borda clara de 1 px + **barra indicadora vertical na borda esquerda** (nav-04); em nav-04 também brilho leve.
5. **Contadores** alinhados à direita, apagados (nav-02) ou em pílula (nav-04).
6. **Topo**: logo. **Rodapé**: conta, configurações; em nav-01 um **orbe com gradiente no rodapé** (encaixa com o orbe do assistente).
7. **Dois níveis** (nav-02): trilho de ícones + painel secundário com perfil, seções, busca e **árvore de pastas** com contagem.
8. **Detalhe HUD** (nav-03): cantoneiras (colchetes nos cantos) para marcar o item ativo e molduras; ticks entre ícones. ⚠️ nav-03 usa fonte monospace — **não adotar a fonte**, só as molduras.
9. **Textura pixelada/pontilhada** de fundo (nav-01) — possível para login, telas vazias ou fundo de destaque.
10. Botões de ação flutuantes no canto inferior direito, quadrados arredondados (nav-01: expandir, IA).

### Decisões do menu lateral (2026-10-26)
| Tema | Decisão |
|---|---|
| Item ativo | Pílula com preenchimento sutil + borda 1 px + **barra de acento vertical à esquerda**, **sem brilho** |
| Assistente no computador | **Os dois**: orbe no rodapé do menu **e** campo "Pergunte…" no cabeçalho |
| Níveis | **Um só nível** (sem painel secundário) |
| Estado inicial | **Recolhido** por padrão; lembra a escolha da pessoa |
| Cantoneiras HUD | **Adotadas** como gesto da marca (aplicação exata a definir nos componentes) |

---

## Regras globais de estilo (2026-10-26)
| Regra | Status |
|---|---|
| **Brilho = IA**: brilho leve só no que é do assistente (orbe, sugestões, propostas da IA) | ✅ Confirmada |
| **Hachurado = planejado/pendente · sólido = feito** (barras, progresso, calendário) | 🟡 Provisória — aceita por ora, revisar |
| **Um só acento preenchido por tela** (um cartão ou KPI em destaque por vista) | 🟡 Provisória — boa ideia, não 100% confirmada |

## Adiado
- **Uso nas páginas** (ex.: em quais telas vai o painel direito, qual tela recebe qual padrão): decidir **depois** de fechar componentes, formas e estruturas. Fase atual = só componentes e linguagem visual.
- Escala de tamanhos tipográficos: afinar depois.

---

## B5. Botões grandes — análise de formas (2026-10-26)

Pedido: **botões grandes, modernos e minimalistas sempre que possível.**
Referências: `btn-01-grupo-conectado` · `btn-02-blocos-squircle` · `btn-03-menu-tema` · `btn-04-acoes-assistente` · `btn-05-etapas-petala`.
Prévia: `preview-botoes.html`.

### Formas identificadas
1. **Grupo conectado / "ponte líquida"** (btn-01): círculo + pílula + pílula fundidos por pescoços curvos; dentro, pílulas com contorno de 1 px (**dupla camada**: casca + pílula interna). Separadores verticais finos entre opções.
2. **Blocos squircle** (btn-02): blocos quadrados grandes de cantos muito suaves dentro de uma **moldura**, separados por vão fino; o cruzamento dos vãos forma um losango. Ícone centralizado; **pontos no canto = estado**. Cabeçalho em pílula com ícone de ajuste.
3. **Menu de ações + seletor segmentado de ícones** (btn-03): linhas ícone + texto com divisores; seletor tema escuro/claro/sistema com o ativo em caixa com contorno.
4. **Grade de ações rápidas** (btn-04): blocos 3×2, ícone no topo à esquerda, rótulo embaixo à esquerda, vão mínimo. Junto, **título em dois tons** ("Oi Jess," branco + "como podemos ajudar?" cinza).
5. **Etapas em pétala** (btn-05): blocos numerados (01…08), rótulo no topo, **seta de direção** no canto; **cantos assimétricos** (um canto em quarto de círculo = forma de folha/pétala); último bloco com **ponta de seta**; preenchimento progride do claro ao acento.

### Proposta (aguardando aprovação)
| Forma | Uso no Nipëi OS |
|---|---|
| **Bloco (tile)**: ícone topo-esquerda, rótulo embaixo, ponto de estado / número no topo-direita, raio 20 px, dentro de moldura raio 28 px com vão 8 px | Atalhos, ações rápidas, sugestões do assistente, menu "Criar" |
| **Etapas**: feito = sólido · agora = acento com **um canto em pétala** · próximo = **hachurado** · último = **ponta de seta** | Formulários em etapas (nova tarefa, cadastro) |
| **Botão principal grande** — 4 candidatos: folha (cantos alternados) · pílula · largo com contorno · dupla camada | Ação principal da tela |
| **Grupo conectado**: barra inferior do celular + orbe do assistente fundidos por ponte líquida | Navegação do celular |
| **Seletor segmentado de ícones** | Tema, vistas (lista/grade), período |
| **Cantoneiras HUD** | Seleção e foco |

Notas técnicas: folha/pétala = `border-radius` assimétrico (CSS simples); ponta de seta = `clip-path`; ponte líquida = filtro SVG (ou forma SVG fixa); squircle real = `corner-shape: squircle` (suporte ainda limitado) com fallback em raio comum.

### Decisões (2026-10-26)
| Tema | Decisão |
|---|---|
| Botão principal | **Mistura**: **folha** (cantos alternados) só para *a* ação principal da tela; **pílula** para as demais ações primárias |
| Pétala | ✅ **Assinatura da marca** ("gesto natureza"): etapa atual, ação principal, cartão em destaque — par com as cantoneiras HUD ("gesto tech") |
| Botão largo com contorno ("Adicionar tarefa +") | ❌ Descartado |
| Dupla camada ("Baixar relatório") | ❌ Descartado — **contorno não é estilo de botão** |
| Barra do celular + orbe com ponte líquida | ✅ Aprovado por ora — provavelmente será ampliado/melhorado depois |
| Seletor segmentado de ícones | ✅ Aprovado |
| Bloco de atalhos | ✅ Aprovado como na prévia (ícone topo-esquerda, rótulo embaixo, ponto/número topo-direita) |
| Etapas (pétala, hachurado, seta) | ✅ Aprovado implicitamente — confirmar |

### Proposta: sistema de botões sem contorno (aguardando)
Hierarquia por preenchimento (tema escuro; contraste calculado):
| Variante | Fundo | Texto | Contraste |
|---|---|---|---|
| Primário | `#C3D14A` | `#0A0A0A` | 11,8 |
| Tonal (secundário) | `#303030` | `#FFFFFF` | 13,2 |
| Fantasma | transparente (hover `#1A1A1A`) | `#FFFFFF` | — |
| Destrutivo forte | `#FF6B5E` | `#0A0A0A` | 7,1 |
| Destrutivo suave | `#2C1514` | `#FF6B5E` | 6,1 |
| Desativado | `#1A1A1A` | `#858585` | 4,7 |

Tamanhos: **G** (padrão, ~56 px de altura, 16 px) · **M** (~48 px, 15 px) · **P** (~40 px, 14 px, só computador denso). Botão de ícone: círculo 52/40 px, fundo tonal. Estado "Enviando…" com indicador girando.

### Correções (2026-10-26)
- ❌ **"Remover" não pode ser vermelho** (nem G nem M). Remover = botão **tonal** (ou fantasma) com ícone de lixeira; o perigo é comunicado pelo **diálogo de confirmação**. Pendente: se o botão de confirmar *dentro* do diálogo pode usar vermelho.
- ✅ **Todo botão tem ícone. Nunca emoji** (em botões, menus, avisos ou qualquer parte da interface). Botão só de ícone precisa de rótulo acessível + tooltip.
- Biblioteca de ícones: **ainda não decidida** (prévias usam lucide provisoriamente).

---

## A7. Ícones e símbolos — direção "ancestral" (2026-10-26)

Pedido: ícones de botões, menu etc. com **símbolos que evoquem natureza e ancestralidade**.
Referências: `sim-01-silhuetas` · `sim-02-selos-circulares` · `sim-03-padrao-espirais`.

### O que as referências têm
1. **Silhuetas cheias, sem traço** (sim-01): formas sólidas e pesadas, nada de contorno fino.
2. **Construídas com poucas formas primárias empilhadas**: semicírculo, triângulo, taça, crescente, degrau, leque de folhas — leitura "totêmica".
3. **Simetria** quase sempre vertical.
4. **Espaço negativo esculpido** (sim-02): o motivo é recortado em branco dentro de um **disco preto** — selo/carimbo.
5. **Contêiner uniforme** (círculo, às vezes quadrado/squircle — sim-03): é o que transforma desenhos diferentes num **sistema**.
6. **Motivos da natureza**: sol, água/onda, gota em espiral, fogo, planta/árvore, pássaro, mão, olho, orelha, concha, borboleta, onda sonora.
7. **Espirais e labirintos de linha fluida** (sim-03), usados como **padrão repetido** sobre papel.
8. **Textura artesanal**: bordas irregulares de carimbo/linoleogravura, grão de tinta, fundo de papel.

### Proposta (aguardando)
Dois níveis, porque ícone pequeno de interface precisa ser reconhecido na hora e textura some em 16–20 px:

| Nível | Onde | Estilo |
|---|---|---|
| **1. Ícones funcionais** | Dentro de botões e campos, ações universais (buscar, fechar, mais, lixeira, seta, editar) | Simples e reconhecíveis, **cheios** (não traço fino), cantos arredondados, sem textura. Biblioteca com variante *fill* para combinar com as silhuetas. |
| **2. Símbolos Nipëi (selos)** | Itens do menu, seções, blocos de atalho, equipes, assistente, estados vazios | **Conjunto próprio** desenhado no estilo das referências: silhueta cheia **dentro de um selo** (círculo/squircle) com espaço negativo; ≥ 24 px; sem textura em tamanho pequeno. |
| **3. Textura e padrão** | Login, telas vazias, fundos de destaque, cartão em destaque | Selos repetidos em padrão (sim-03) com textura de carimbo, em baixa opacidade. |

Ideias de uso:
- **Selo por equipe**: cada equipe com seu símbolo + sua cor (ex.: Guardiões = pássaro/olho; Produção = planta; Manutenção = mão; Escritório = espiral) — a escolher.
- O **selo circular** casa com o orbe do assistente, os botões de ícone circulares e as cantoneiras HUD (selo = natureza, cantoneira = tech).
- Regras de desenho: grade 24 px, peso visual único, uma cor (`currentColor`), detalhes ≥ 2 px, funciona em claro e escuro.

⚠️ **Origem dos símbolos**: a plataforma é do povo Yawanawá. Se os símbolos se aproximarem dos **kene** ou de outros grafismos tradicionais, o ideal é desenhá-los **com a comunidade / artistas Yawanawá** e com permissão, em vez de inventar "símbolos indígenas" genéricos. Alternativa: símbolos de natureza neutros (sol, água, planta) no estilo das referências, sem imitar grafismos tradicionais.

### Decisões de ícones (2026-10-26)
| Tema | Decisão |
|---|---|
| Estilo dentro dos botões | **Ancestral também** (não só nos selos): silhueta cheia, sem traço |
| Origem dos desenhos | **Motivos de natureza neutros** — não imitar kene nem grafismos tradicionais |
| Selo por equipe | ✅ Sim; por ora o motivo mais relacionado à função da equipe |
| Botão de confirmar no diálogo de remoção | ✅ **Pode ser vermelho** (`#FF6B5E` + texto `#0A0A0A`, 7,1) — único lugar com botão vermelho |
| Inventário de ícones | Ver `ICONES.md` (~72 funcionais + ~14 selos) |

---

## A8. Conjunto de símbolos do Ashuan (SVG único, 2026-10-26)

Arquivo recebido: 1 SVG (Adobe Illustrator, 6300×3700) com **63 símbolos** em 9 cores, desenhados como traço grosso à mão (contorno preenchido).
Feito: separados automaticamente em **63 SVGs** (`design/icones/simbolos/simbolo-01.svg` … `-63.svg`), cada um quadrado, `fill="currentColor"` (pegam a cor do tema). Prévia: `preview-simbolos.html`.

### Análise
- Estilo: **traço grosso desenhado à mão**, pontas arredondadas, leve irregularidade; muitos com pontos ao redor (irradiação), simetria, losangos, espirais, sóis, olhos, mãos.
- Leem bem em 24 px; em **16 px** os símbolos largos (25, 30, 33, 38, 42, 52) ficam pequenos demais — precisam ser redesenhados em formato quadrado se forem usados como ícone.
- Mistura dois tipos: **motivos de natureza** (sol 27/37/58, lua 14/59, broto 03, mão 17, olho 57/16, espiral 18, gota 26, montanha 10/11) e **glifos tipo "escrita inventada"** (28, 30, 31, 38, 40 …). Pela decisão "natureza neutra", priorizar os primeiros.
- **Não existe** nesse conjunto o equivalente de ícones funcionais (lixeira, editar, baixar, calendário, buscar…) → esses precisam ser **desenhados no mesmo estilo de traço**.
- Licença: o nome do arquivo parece de banco de imagens — **confirmar que a licença permite uso em aplicativo**.

### Mapeamento proposto (aguardando)
| Uso | Símbolo |
|---|---|
| Hoje | 27 (sol) |
| Agenda | 14 (lua) |
| Tarefas | 03 (broto) |
| Conhecimento | 18 (espiral) |
| Acervo | 54 (quadrados concêntricos) |
| Pessoas | 17 (mão) |
| Painel | 57 (olho) |
| Assistente / IA | 47 (centro irradiando) |
| Equipe Escritório | 13 (ponto central organizado) |
| Equipe Produção Yawanawa | 11 (planta/montanha) |
| Equipe Guardiões | 10 (montanha com olho) |
| Equipe Manutenção | 62 (cruz de laços) |

### Licença e ícones funcionais (2026-10-26)
- Licença dos símbolos: **Magnific**, app de **uso interno** → liberado.
- **Lote 1 de ícones funcionais** desenhado no traço dos símbolos (grosso, à mão, pontas arredondadas, pontos como assinatura): `mais`, `fechar`, `editar` (pena), `lixeira` (cesto), `buscar`, `voltar` (flecha com penas, ref. símbolo 33), `calendario`, `pessoa`. Arquivos em `icones/funcionais/`; prévia em `preview-icones.html`. Status: **aguardando revisão**.
- Processo: desenho em traço (24×24, espessura 2,6) → convertido em **um só caminho preenchido** (`currentColor`).

---

## A9. Símbolos — lote 2 (SVG único, 2026-10-26)

Arquivo recebido: 1 SVG (Illustrator, 4800×3600) com **42 símbolos** em silhueta cheia (marrom).
Comentário do Ashuan sobre o lote 1 de funcionais: `editar`, `lixeira`, `voltar` **não parecem ancestrais** — ficam por ora, revisar depois.

Feito:
- Separados em **42 SVGs**: `icones/simbolos-2/simbolo2-01.svg` … `-42.svg` (versão final) e `icones/simbolos-2/original/` (como vieram).
- **Harmonização com o lote 1**: a espessura do traço já era igual (medida ≈ 7% do tamanho nos dois conjuntos). Para aproximar o resto: removidos pontinhos e texturas pequenas (que viram ruído em 16–24 px), preenchidos furos minúsculos, **cantos arredondados** (o lote 1 tem pontas redondas), mesmo tamanho ótico e margem, `fill="currentColor"`.
- Prévia: `preview-simbolos-2.html` (original × simplificado, em 24/20/16 px).

### Análise
- Estilo: silhueta cheia e mais detalhada que o lote 1 (que é traço aberto feito à mão). Depois da simplificação ficam próximos; a diferença que resta é **cheio × vazado**.
- **Natureza** (bons para a direção "natureza neutra"): lagarto 01/31, broto com flores 02, sol-lua 03, tartaruga 05, agave 07/12/27, galho com frutos 09, chuva 10, rio 14, cacto 16/24/25/40, sementes 17, sol 19/34, folhas 23/32/36, lua-montanha 26, flor 30, nuvens 37, lhama 39.
- **Padrões geométricos** (bons como ornamento/selo): 04, 06, 13, 28, 29, 33, 35.
- ⚠️ **Símbolos com significado sagrado/religioso de outros povos** — evitar como ícone: **chakana** andina (11, 18, 22, 42), **pássaro-trovão** norte-americano (20, 21, 41), **hamsá** (15), vaso cerimonial (08), arco/porta (38).
- Paisagem do conjunto é do deserto/Andes (cacto, lhama, agave) — pouco ligada à floresta; preferir os motivos universais (sol, lua, chuva, rio, folha, flor, semente, nuvem).

### Candidatos do lote 2 para selos (aguardando)
| Uso | Opção lote 1 | Opção lote 2 |
|---|---|---|
| Hoje | 27 sol | 19 / 34 sol |
| Agenda | 14 lua | 26 lua-montanha · 03 sol-lua |
| Tarefas | 03 broto | 02 broto com flores |
| Conhecimento | 18 espiral | 34 sol-espiral |
| Acervo | 54 | 17 sementes |
| Pessoas | 17 mão | — |
| Finanças | — | 09 galho com frutos |
| Equipe Produção | 11 | 32 folha / 07 agave |
| Equipe Manutenção | 62 | 14 rio |
| Clima / avisos | — | 10 chuva · 37 nuvens |

---

## A10. Símbolos — lote 3 e biblioteca unificada (2026-10-26)

- Lote 2: ✅ aprovado pelo Ashuan ("me encantou").
- Lote 3: 1 SVG (500×500) com **9 símbolos**: cogumelos, sol, pena, cálice, frasco, cristal, pedras, tubo com ervas, olho. Separados em `icones/simbolos-3/simbolo3-01…09.svg` (+ `original/`).
- Harmonização: o traço deste lote era mais fino (≈ 5,6% do tamanho × ≈ 7% nos outros) → **engrossado** até a mesma espessura, depois a mesma simplificação do lote 2 (sem pontinhos, cantos arredondados).
- A **pena (lote 3 · 03)** é candidata para substituir o ícone "editar".
- **Biblioteca unificada**: artefato "Ícones Nipëi OS" com os **122** ícones (8 funcionais + 63 traço + 42 silhueta + 9 lote 3), filtros por conjunto e tipo, busca, 3 tamanhos, uso proposto e botão "Copiar SVG". Arquivo local: `icones-nipei.html`.

### Funcionais revisados (2026-10-26)
- **editar** = **pena** (lote 3 · 03) ✅
- **lixeira** = versão **simples**: tampa + alça + corpo, sem marcas internas.
- **voltar** = **triângulo cheio para a esquerda**; **avançar** (novo) = triângulo para a direita.
- Biblioteca "Ícones Nipëi OS" atualizada (123 ícones).

### Funcionais P1 completos (2026-10-26)
Lote 2 desenhado: `confirmar`, `enviar` (triângulo + linhas de movimento), `mais-opcoes` (3 pontos), `abrir` (triângulo para baixo; girar 180° para fechar), `sucesso`, `erro`, `informacao` (círculo à mão), `atencao` (triângulo), `cadeado`, `tarefa` (pontos + linhas), `prazo` (ampulheta), `pessoas`, `mensagem` (balão com 3 pontos), `filtrar` (3 linhas decrescentes).
Total: **23 funcionais P1** em `icones/funcionais/`. Todos unidos num único caminho limpo (sem sobreposição), 24×24, `currentColor`.
Linguagem fixada: **triângulo cheio = direção** (voltar, avançar, abrir, enviar) · **pontos = assinatura** (mais, buscar, mensagem, tarefa, calendário, cadeado) · **círculo à mão = estado** (sucesso, erro, informação).
Próximo: P2 (27 ícones).

---

## C19. Assistente de IA — análise das referências (2026-10-26)

Referências: `ia-01-voz-bento` · `ia-02-capacidades-recentes` · `ia-03-caminho-cartoes` · `ia-04-orbe-pontos`.
Componente atual: `AssistenteGlobal` (botão flutuante + painel com mensagens, cartões de proposta Confirmar/Cancelar, voz, sugestões) + `CampoAssistente` (campo na página Hoje).

### O que as referências mostram
1. **Orbe vivo como rosto da IA**: bolha orgânica iridescente que se deforma (ia-01) ou **esfera de pontos/partículas em verde** (ia-04). Ocupa o centro da tela no modo voz.
2. **Modo voz em tela cheia** (ia-01): orbe no centro, **transcrição ao vivo grande e centralizada** com as palavras finais apagadas (dois tons), selo de estado no topo ("AI Buddy" + ponto "Online"); embaixo: **microfone grande em acento com anéis de pulso**, trocar para teclado à esquerda, fechar à direita.
3. **Tela inicial do assistente**: pergunta-saudação enorme e fina ("How may I help you today?"), às vezes com **uma palavra em acento** ou em itálico (ia-02, ia-04).
4. **Grade bento de ações** (ia-01): um bloco grande preenchido com acento ("Falar") + blocos menores coloridos (conversar, buscar por imagem), cada um com ícone em círculo e ↗.
5. **Campo de mensagem em pílula** com "+" e microfone (ia-04); **chips de sugestão com ícone** logo abaixo ("Escrever post", "Análise de dados").
6. **Histórico**: linhas com ícone em círculo + texto truncado + ⋮ (ia-01); **recentes em chips** (ia-02); botão largo flutuante "+ Nova conversa".
7. **O que a IA sabe fazer** (ia-02): lista de capacidades e limites em cartões-pílula com ícone ("lembra o que foi dito", "aceita correções", "recusa pedidos impróprios") — gera confiança.
8. **Automações / rotinas** (ia-02): cartões horizontais com botão "gerar" — paralelo direto com os **cartões de proposta** (Confirmar/Cancelar).
9. **Cartões flutuantes** de ação pendente ("Action required", ia-03).
10. **Caminho de contas conectadas por ponte líquida** (ia-03) e **nav de círculos fundidos** — mesma linguagem da nossa barra com orbe.
11. **Microfone elevado no centro da barra inferior** com brilho (ia-04) — na nossa barra, esse lugar é do orbe.
12. **Textura de curvas de nível** (linhas topográficas, ia-01) atrás do orbe — natureza + tech.

### Encaixe com o que já decidimos
- Brilho = IA → o orbe e os blocos do assistente são o único lugar com brilho.
- Pontos = assinatura → orbe de partículas (ia-04) reforça a marca.
- Um só acento preenchido por tela → o bloco "Falar" é o destaque.
- Ponte líquida → já usada na barra do celular.

### Decisões do assistente (2026-10-26)
| Tema | Decisão |
|---|---|
| Nome | **Pinu** |
| Orbe | **Gradiente com as cores da marca** (`#042608` → `#2A5C0B` → `#808F12` → `#C3D14A`), forma orgânica que se deforma devagar; brilho leve (brilho = IA) |
| Estados do orbe | ✅ **Repouso** (respira lento) · **Ouvindo** (reage à voz) · **Pensando** (ondula e gira mais rápido) · **Falando** (pulsa com a resposta) |
| Prévia | `preview-pinu.html` (protótipo de movimento, CSS) |
| Adiado (decidir depois) | modo voz em tela cheia e o que abre primeiro (voz ou chat) · curvas de nível como textura · lista "o que o Pinu sabe fazer" |


---

## STATUS GERAL (atualizado 2026-10-26)

### ✅ Fechado
- **A0 Identidade**: Nipëi OS · tema escuro principal + versão clara · celular primeiro · preciso/minimalista/futurista/natureza.
- **A1 Cor**: paleta, texto, acentos por tema, estados, cores de equipe (contraste verificado).
- **A2 Tipografia**: Outfit (display 200–300, seção/cartão 600) + Google Sans (corpo 400, botões 500–600). Nunca monospace.
- **A3 Forma**: pílula em botões/chips/campos/abas · círculo em botões de ícone/avatar · cartões 16 px (celular) / 12 px (computador) · plano, sem sombra · densidade maior no computador.
- **A4–A6 Estilo visual e menu lateral** (análise das referências, menu recolhível, item ativo com barra, orbe no rodapé + campo no cabeçalho, cantoneiras HUD).
- **Regras globais**: brilho = IA ✅ · hachurado = planejado 🟡 · um acento preenchido por tela 🟡.
- **B5 Botões**: folha (ação principal) + pílula; primário/tonal/fantasma; sem contorno; "Remover" não é vermelho (só no diálogo); tamanhos G/M/P; todo botão tem ícone, nunca emoji. Bloco de atalhos, etapas em pétala, seletor segmentado, barra do celular com ponte líquida.
- **A7–A10 Ícones**: 23 funcionais P1 + 114 símbolos (3 lotes) → biblioteca "Ícones Nipëi OS".
- **C19 Pinu**: nome, orbe em gradiente da marca, 4 estados.

### ⏸ Adiado
- Escala de tamanhos tipográficos · uso dos padrões em cada página (painel direito etc.) · modo voz / textura / lista de capacidades do Pinu · ícones P2 (27) e P3 (23) · revisar hachurado e regra do acento.

### ▶ Próximo (ordem)
1. **B6 Campo**: texto, área de texto, busca, select, data; rótulo, ajuda, erro.
2. **B7 Chip / Badge**: filtro com contagem e cor de equipe; selos de estado.
3. **B8 Cartão**: padrão, clicável, com barra de cor da equipe, KPI, bento.
4. **B9 Avatar** e grupo "+3".
5. **B10 Aviso** (banner) e **Toast**.
6. **B11 Abas** (segmentado × sublinhado) e **Seção recolhível**.
7. **B12 Progresso** (barra fina, anel) · **B13 Vazio + Skeleton**.
8. **C** Padrões compostos (linha de tarefa, cabeçalho, busca+filtros, faixa da semana, tabela, linha do tempo) · **D** Diálogo, menu ⋯, switch.
9. **Final**: `DESIGN-SYSTEM.md` completo (tokens, componentes, estados, claro/escuro, celular/computador).

---

## B6–B11. Referências de componentes — lote 1 (2026-10-26)

Referências: `comp-01-abas-barra` · `comp-02-formulario-campos` · `comp-03-avisos-estado` · `comp-04-botao-dividido` · `comp-05-paleta-petalas`.

### comp-01 · Abas em barra (3 versões)
- **v1**: barra escura em pílula; itens = ícone + texto; **ativo = pílula tonal elevada com o ícone em acento**; hover = pílula mais suave.
- **v2**: **aba-pasta** — a aba ativa se funde com a superfície de baixo (curvas invertidas nos cantos), como uma ficha; divisor vertical separa grupos.
- **v3**: só texto; **ativo = ponto de acento embaixo** (com brilho); hover = pílula.
→ Proposta: v1 = abas de seção (Agenda Dia/Semana/Mês, filtros principais) · v2 = abas de ficha (Tarefa: Detalhes / Comentários / Atividade) · v3 = navegação superior no computador. Ponto ativo **sem brilho** (brilho = IA).

### comp-02 · Formulário (campos)
- **Abas grandes em texto, dois tons**: ativa branca, demais cinza, sem sublinhado (Story · Details · Symbols).
- **Campo = superfície tonal, sem borda**; placeholder grande e fino ("Type a title").
- **Rótulo pequeno dentro do cartão**, no topo à esquerda ("Story"), texto do campo embaixo.
- **Sugestão da IA dentro do campo**: "↪ Following the White Rabbit ⟳" → no Nipëi: sugestão do Pinu com aceitar (↪) e gerar outra (⟳).
- **Campo de áudio**: botão play circular + forma de onda em barras (mesma textura "código de barras") + ⋯.
- Rótulo de seção em maiúsculas pequenas ("IMAGES") + blocos de ação (Gerar ✦ / Desenhar).
- Salvar = pílula clara no canto superior direito.
→ Confirma "contorno não é estilo": **campo tonal sem borda**; foco = mudança de tom + cantoneira HUD ou anel de acento.

### comp-03 · Avisos / diálogos de estado
- Cartão escuro com **lavagem de cor do estado vindo de um canto** (azul = andamento, verde = sucesso, vermelho = erro), ícone em **círculo da cor do estado**, título semibold, mensagem, **barra de progresso com %**, ações em botões tonais, ✕ no canto.
→ Base para **Aviso**, **Toast** e **Diálogo de confirmação**. A lavagem é **tinta suave, não brilho** (para não conflitar com brilho = IA).

### comp-04 · Botão dividido
- Rótulo e seta em **duas peças separadas** por um **corte diagonal**; cores invertidas (escuro + lima / lima + escuro). Fonte monospace da referência **não** se aplica.
→ Candidato para CTA de avanço ("Continuar →", "Criar tarefa →") — conversa com a ponta de seta das etapas e com a pétala.

### comp-05 · Paleta em pétalas
- Cada cor apresentada como **par círculo + pétala** (forte + clara); papéis: primária (ações), secundária (apoio/categorias), terciária (erros/categorias), complementares (categorias); **escala neutra** em ~9 passos, também em pétalas.
→ Reforça a **pétala como forma da marca**; usar esse formato para documentar a paleta no design system final. Sugere organizar as cores por **papel** e completar a escala neutra (hoje: `#0A0A0A #141414 #1A1A1A #303030 #424242 #6B6B6B #858585 #B3B3B3 #DEDEDE #FFFFFF`).

### Perguntas em aberto (aguardando mais referências)
1. Abas: confirmar o uso de v1 / v2 / v3 e das abas grandes de texto (comp-02).
2. Campo: foco com cantoneira HUD ou anel de acento? Rótulo dentro do cartão ou acima?
3. Sugestão do Pinu dentro dos campos (↪ / ⟳): sim?
4. Avisos com lavagem de cor no canto: sim? Toast usa o mesmo cartão em versão compacta?
5. Botão dividido com corte diagonal: entra como variante de CTA de avanço?
6. Paleta: documentar em pétalas e organizar por papel?

### Respostas (2026-10-26)
| Tema | Decisão |
|---|---|
| Campo — borda | **Sem borda** |
| Campo — hover | **Sombra-brilho muito sutil** ao passar por cima (exceção consciente à regra "plano"; só em campos) |
| Campo — foco | Brilho sutil + anel de acento fino |
| Rótulo | **Dentro do cartão**, pequeno, no topo |
| Sugestão do Pinu nos campos | ✅ Sim (↪ aceitar · ⟳ gerar outra) |
| Avisos com lavagem de cor no canto | ✅ Sim · **Toast** = mesmo cartão, compacto |
| Botão dividido (corte diagonal) | ✅ Variante de CTA de avanço |
| Paleta | ✅ Documentar em **pétalas** e organizar **por papel** |
| Abas | **Mistura de v1 + v2 + v3** num só componente: barra em pílula com ícone + texto (v1); ativa = pílula tonal com ícone em acento (v1) + ponto de acento embaixo (v3); quando a aba controla o conteúdo logo abaixo, a ativa **se funde ao painel** como pasta (v2) |

### Referências complementares — lote 2
`comp-06-slider-controles` · `comp-07-perfil-config` · `comp-08-dashboard-cartoes` · `comp-09-coach-ia` · `comp-10-tema-claro`.

- **Controle deslizante (slider)** (comp-06): trilho em pílula com pontos (ticks), parte preenchida em pílula tonal com cursor fino; **rótulo à esquerda, valor à direita** ("Volume · 54"). Mesmo formato para escolha de opções ("Tema · Claro").
- **Grupo de controles conectados** (comp-06): círculos laterais + botão central grande claro, fundidos (ponte líquida).
- **Cabeçalho de ficha** (comp-07): voltar em círculo · avatar · nome semibold + "@usuário · função" · ação principal à direita em acento.
- **Blocos de ação em linha** (comp-07): ícone + rótulo (Silenciar, Voz, Vídeo, Buscar) — nosso bloco de atalhos.
- **Linha de configuração** (comp-07): agrupadas num cartão, divisor fino, "Rótulo ······ valor >". Base para Painel → Funções e Conexões (com o switch).
- **Cartões de painel** (comp-08): lista com **minigráfico** por linha, abas dentro do cartão, gráfico de linha com pílulas de período, par de botões de ação no rodapé do cartão.
- **IA no meio da interface** (comp-09):
  - **Mini-Pinu = anel** brilhante usado como avatar da IA nas mensagens e **dentro do campo de busca**.
  - Chip **"Sugerido pelo Pinu"** com ✦ em acento sobre conteúdo recomendado.
  - Mensagem da IA em cartão tingido de verde; mensagem da pessoa em pílula com contorno à direita.
  - Sugestões em chips centralizados; campo "Pergunte ao Pinu…" com + e microfone em acento.
  - Brilho verde no topo da tela só nas telas do Pinu (brilho = IA ✅).
- **Tema claro** (comp-10): fundo branco, cartões cinza-claro, **um bloco escuro como destaque** (o "acento preenchido" no claro pode ser o escuro), cabeçalho escuro com **linhas onduladas/topográficas**, linha do tempo vertical com nós, faixa da semana com dia ativo escuro + ponto, botão "+" central elevado com anel.

### Prévia dos componentes (2026-10-26)
`preview-componentes.html` (escuro + claro): **Campo** (título grande com sugestão do Pinu, área de texto com ajuda, busca do Pinu com mini-anel + microfone, busca com filtro, seleção, data, erro) · **Abas** (mistura v1+v2+v3, barra e versão fundida ao painel) · **Aviso / diálogo / toast** (4 estados com lavagem de cor) · **Botão dividido** · **Controle deslizante** · **Linhas de configuração com interruptor**.
Ícones que faltam e surgiram aqui (entram no P2): `microfone`, `gerar-outra` (⟳).
Status: ✅ aprovado.

### Aprovação dos componentes base + ícones em tudo (2026-10-26)
- ✅ Ashuan aprovou tudo em `preview-componentes.html` (campo, abas, avisos, botão dividido, slider, configurações).
- Tema claro: destaque da tela = **bloco escuro** (como na referência comp-10) — provisório.
- **Regra: todas as prévias e componentes usam só os ícones do Nipëi** (nada de lucide). Feito em `preview-botoes.html` e `preview-componentes.html`.
- Ícones novos desenhados para cobrir as prévias: `microfone`, `gerar-outra`, `baixar`, `imagem`, `tema-escuro` (lua + pontos), `tema-claro` (sol de pontos), `tema-sistema` (meio círculo), `inicio`. Total funcionais: **31**.
- Na barra do celular, Conhecimento usa o selo **espiral (símbolo 18)**; o alvo das cantoneiras usa a **irradiação (símbolo 47)**.
- `preview-icones.html` (lote 1 antigo) foi substituído pela biblioteca "Ícones Nipëi OS" (`icones-nipei.html`).

---

## B7–B9. Chip, Badge, Cartão, Avatar — proposta (2026-10-26)
Prévia: `preview-chips-cartoes.html` (escuro + claro). Status: ✅ **aprovado** (filtro ativo tonal com ✓ em acento · avatar sem foto na cor da equipe · cartão de tarefa como está).

**Chip** (sempre pílula + ícone)
- Filtro: tonal; **ativo = tom mais claro + contorno interno sutil + ícone de confirmar em acento** (o acento preenchido fica para o destaque da tela). Contagem em pílula interna.
- Equipe: **selo da equipe na cor da equipe** + nome; ativo = anel na cor da equipe.
- Metadado (dentro de cartões): menor, `#303030`, ícone 14 px (prioridade, duração, data, subtarefas).
- "Sugerido pelo Pinu": fundo verde suave + mini-anel; chips de sugestão do Pinu com ícone.

**Badge**
- Contagem: círculo vermelho com número no canto do ícone (ou só ponto).
- Estado: **Pendente = hachurado** · Em andamento = azul suave · Feita = verde suave · Atrasada = vermelho suave · Nota interna = tonal com cadeado.

**Avatar**
- Tamanhos 24 / 32 / 40 / 56 / 80. Sem foto: iniciais em Outfit sobre a **cor da equipe**. Ponto de acento = online. **Selo da equipe** no canto (tamanho grande). Grupo sobreposto com "+N". Linha pessoa = avatar + nome semibold + "equipe · função".

**Cartão**
- Superfície `--s1`, raio 16/12, sem borda e sem sombra. Cabeçalho padrão: [ícone em círculo] Título ····· [⋯ ou ↗].
- **KPI**: número display fino em dois tons + variação. **KPI destaque** = acento preenchido no escuro / **bloco escuro no claro** (um por tela).
- **Tarefa**: projeto (pequeno) · título semibold · metadados · barra de progresso + % · avatares + selo de estado · ⋯.
- **Evento**: barra vertical na cor da equipe · hora · título · chip da equipe · avatares.
- **Clicável**: muda o tom ao passar e o ↗ acende.
- **Pinu sugere**: gradiente verde suave + brilho (brilho = IA) + ações.
- Grade **bento** (3 colunas; 1 no celular).
Ícone novo: `abrir-fora` (↗). Funcionais: **32**.


---

## STATUS GERAL (atualizado 2026-10-26, noite)

### ✅ Fechado
Fundamentos (A0–A10) · Botões (B5) · **Campo (B6)** · **Chip/Badge (B7)** · **Cartão (B8)** · **Avatar (B9)** · **Aviso/Diálogo/Toast (B10)** · **Abas (B11)** · Controle deslizante, linha de configuração e interruptor · Ícones (32 funcionais + 114 símbolos) · Pinu (nome, orbe, estados).

### ▶ Próximo
1. **B12–B13**: barra de progresso + **anel de progresso** · **estado vazio** (com selo/símbolo e ação) · **carregando (skeleton)**.
2. **C — padrões compostos**: linha de tarefa (lista) · cabeçalho de página · barra de busca + filtros · **faixa da semana** · calendário/agenda · tabela · linha do tempo (atividade) · navegação (menu lateral + barra do celular) · painel do Pinu (chat).
3. **D — novos**: menu de ações ⋯ (já há diálogo, toast e interruptor).
4. **Tema claro**: revisão geral.
5. **Final**: `DESIGN-SYSTEM.md` completo + biblioteca de componentes num só artefato.

### ⏸ Adiado
Escala tipográfica exata · uso por página · modo voz / textura / capacidades do Pinu · ícones P2 restantes (≈20) e P3.

---

## B12–B13. Progresso, carregando, vazio, skeleton — proposta (2026-10-26)
Prévia: `preview-progresso-vazio.html` (escuro + claro). Status: **aguardando revisão**.

- **Barra de progresso**: 6 px, pílula, acento. Variantes: simples + valor à direita · **resto hachurado** quando é algo planejado (meta) · com **marcador** e etiqueta de % (ref. 07) · **em segmentos** (subtarefas: feitas sólidas, faltantes hachuradas) · envio (azul de informação).
- **Anel de progresso**: número no centro em display fino. Tamanhos 140 (destaque) · 72 · 48 · 24 (mini, dentro de linhas de lista). **Semana em anéis**: cada dia um anel, hoje em pílula tonal.
- **Carregando**: arco girando em cinza (genérico). Dentro de botão: "Salvando…" com arco. **Mini-orbe do Pinu** só quando a IA está pensando (brilho = IA).
- **Estado vazio**: selo grande de natureza num círculo (sol = nada para hoje · quadrados = acervo vazio · olho = busca sem resultado · espiral = conhecimento) · título Outfit · uma frase que diz o que fazer · uma ação com ícone. Versão destaque com **padrão de selos** em 5% de opacidade e selo em verde.
- **Skeleton**: blocos no tom da superfície com brilho lento passando; imitam a forma real (avatar redondo, título, linhas, chips). Sem animação se a pessoa pediu menos movimento.

### Aprovações e mudança de tipografia (2026-10-26)
- ✅ B12–B13 (progresso, carregando, vazio, skeleton) aprovados.
- 🔁 **Cabeçalho de página: título grande e em NEGRITO** (Outfit 700, 40–64 px). Substitui o display fino *nos títulos de página*. O display fino (200–300) continua para números KPI, dias grandes e frases de saudação.

---

## C14–C15. Linha de tarefa e cabeçalho de página — proposta (2026-10-26)
Referências: `lt-01-cartoes-recorte` · `lt-02-lista-calendario` · `lt-03-kanban-atividade` · `lt-04-linha-do-tempo`. Prévia: `preview-tarefas.html`.

**O que as referências trazem**
- lt-01: título de seção com **contagem** · filtros em pílula com busca e ajuste em círculo · cartões com o **canto superior direito recortado** abrigando botões redondos (↗, lembrete) · estado como **pílula com menu** (avatar + "Aguardando ▾") · um cartão em destaque com cor.
- lt-02: projetos com **barra de cor à esquerda** + contagem tingida + ⋮ · calendário mensal com pontos · lista com **caixa de concluir, título riscado e "Concluída em 1 out"** · avatares à direita.
- lt-03: **quadro (kanban)** por estado com indicador de cor · cartão com etiquetas, descrição, subitens, avatares, contagem de comentários · alternar **Lista / Quadro / Tabela** · painel de atividade com **Aprovar / Recusar** dentro do item.
- lt-04: linha do tempo por hora (já registrada).

**Proposta**
- **Cabeçalho**: rótulo da equipe (selo) · título Outfit 700 · subtítulo com contagens · busca em círculo + ação principal em **folha**. Embaixo: abas de vista (Lista · Quadro · Agenda) + chips de filtro.
- **Linha de tarefa (lista)**: barra fina na cor da equipe · círculo de concluir (passar por cima = anel de acento) · título + selo da equipe + prazo (vermelho se atrasada) · metadados (prioridade, subtarefas, comentários) · avatares · selo de estado · ⋯. **Feita** = círculo preenchido com ✓, título riscado e apagado. Agrupada por **Atrasadas / Hoje / Amanhã…** com contagem. No celular: some metadados e estado.
- **Cartão com recorte**: variante em grade; canto recortado com botão ↗ redondo; estado em pílula com menu; um em destaque.
Status: **aguardando revisão**.

---

## C19b. Chat do Pinu — proposta (2026-10-26)
Referências: `chat-01-voz-bento` · `chat-02-campos-deslizar` · `chat-03-sem-balao` · `chat-04-verde-ouvindo`. Prévia: `preview-pinu-chat.html` (celular).

**O que as referências trazem**
- chat-02: campos grandes com rótulo dentro (confirma B6) · **botão de busca largo em gradiente com "≫"** (estilo deslizar para confirmar) · cartão com **recorte em cima** (confirma o recorte).
- chat-03: **gradiente de cor no topo** atrás da saudação em dois tons · nome da IA com ícone · cartões de sugestão + pílulas de anexar/câmera/microfone · conversa **sem balões**: rótulo (avatar + nome) e texto corrido · ações embaixo da resposta (útil, editar, ⋮).
- chat-04: fundo verde em gradiente · "No que vamos trabalhar hoje?" · cartões de sugestão com ✦ · campo grande com anexar + microfone · **modo ouvindo**: orbe, "Jarvis está ouvindo…", transcrição em dois tons, anexar · microfone grande com anel · enviar · "Fechar conversa" em pílula.

**Proposta**
- **Fundo**: gradiente verde/oliva da marca vindo do topo (forte no início, suave na conversa) — permitido por brilho = IA.
- **Início**: selo "Pinu" com mini-anel · saudação display fina em dois tons · bento: **"Falar com o Pinu" em folha preenchida com acento** (destaque da tela) + 2 sugestões com ícone · Recentes · campo grande com + / imagem / microfone, com brilho sutil.
- **Conversa**: **pessoa = balão tonal à direita** · **Pinu = sem balão**, mini-anel + nome + texto corrido (lê melhor respostas longas) · ações da resposta: gerar outra · editar · ⋯.
- **Cartão de proposta** (substitui Confirmar/Cancelar atual): gradiente verde suave + brilho, ícone + "Criar 3 tarefas" + selo "Proposta", lista do que vai ser feito (com responsável e prazo), ações **Confirmar** (primário) · **Ajustar** (tonal) · **Cancelar** (fantasma).
- **Pensando**: mini-orbe girando + "Pinu está pensando…" + skeleton de 2 linhas.
- **Sugestões de continuação** em chips acima do campo.
- Ideia para depois: **deslizar para confirmar** em ações sensíveis (chat-02).
Status: **aguardando revisão**. Pendente das rodadas anteriores: recorte como forma da marca? · fazer vista Quadro (kanban)?

---

## C17. Agenda e Quadro (kanban) — proposta (2026-10-26)
Feita só com referências já enviadas: 01 (anéis por dia), 03 (dias grandes), 07 (semana em pílulas), 08 (grade de horas, eventos em pílula, menu "+"), 09 (calendário), desk-01 (mês + lista ao lado), desk-02 (grade densa), lt-02 (mês com pontos + lista), lt-03 (kanban). Prévia: `preview-agenda-quadro.html`.

- **Cabeçalho**: "Agenda" em negrito + contagens · busca + "Novo evento" em folha · abas Dia / Semana / Mês · chips das 4 equipes (com selo) para filtrar.
- **Dia**: faixa da semana em pílulas verticais (dia escolhido em acento; pontos = quantidade de eventos) · grade de horas com **linha do agora** (âmbar) · **evento com horário = bloco tingido na cor da equipe** com barra à esquerda, local e avatares · **tarefa/lembrete = pílula** com ícone + ponto de cor · botão "+" redondo flutuante.
- **Lista por dia** (alternativa ao lado / no celular): número do dia **grande e fino**, hoje destacado, "Sem eventos" discreto, eventos em cartões com barra da equipe.
- **Mês**: grade com **pontos na cor de cada equipe**, hoje em círculo de acento, setas ‹ › nos cantos · ao tocar o dia, a lista aparece embaixo (celular) ou ao lado (computador).
- **Quadro (kanban)**: uma coluna por estado com o selo do estado (pendente hachurado), contagem e "+" · cartão compacto com selo da equipe, título, metadados, avatares, subtarefas e comentários · "Adicionar tarefa" hachurado no fim da coluna · arrastar muda o estado · no celular, colunas viram páginas deslizáveis.
Status: **aguardando revisão**.

### Respostas (2026-10-26)
- ✅ **Recorte no canto dos cartões** adotado como forma da marca (junto com pétala e cantoneira HUD): o canto superior direito recortado abriga um botão redondo (↗ ou ação rápida).
- ✅ **Chat do Pinu com balão**: a resposta do Pinu vai num balão tingido de verde (gradiente suave + contorno sutil), à esquerda, com mini-anel + nome em cima; a pessoa em balão tonal à direita. `preview-pinu-chat.html` atualizado.
- Agenda e Quadro: sem objeções.

---

## C16, C18, C20, D23. Tabela · Linha do tempo · Navegação · Menu ⋯ — proposta (2026-10-26)
Prévia: `preview-tabela-nav.html` (escuro + claro).
- **Tabela** (Painel, computador): cartão com cabeçalho padrão + período em abas · cabeçalho de colunas pequeno em maiúsculas, a coluna ordenada fica clara com triângulo em acento · linhas de 56 px, sem zebra, divisor fino, passar por cima muda o tom · números à direita com algarismos tabulares · **minigráfico** com ponto final (vermelho quando cai) · estado em selo · ⋯. **No celular**: cada linha vira cartão (pessoa + minigráfico + número grande fino + estado).
- **Linha do tempo (atividade)**: agrupada por dia · nó redondo com ícone na cor do tipo (concluiu = acento, comentou = azul, mudou estado = âmbar, pedido = cor da equipe, Pinu = mini-anel) · "**Quem** fez o quê em **qual tarefa**" · hora à direita · comentário em balão · mudança de estado em selos "antes ▶ depois" · pedidos com **Aprovar / Recusar** no item.
- **Menu ⋯**: cartão flutuante um tom acima com borda sutil (sem sombra), itens com ícone, divisor antes de ações sensíveis; "Remover…" abre o diálogo (não é vermelho no menu); o botão ⋯ fica com anel de acento enquanto o menu está aberto.
- **Navegação completa (computador)**: menu flutuante **recolhido** (logo em folha, selos, ponto vermelho = novidade, configurações, orbe do Pinu no pé) e **expandido** (grupos Principal / Equipe com rótulo, selo + nome + contagem, botão recolher) · ativo = pílula sutil + barra de acento à esquerda · topo do conteúdo: campo "Pergunte ao Pinu ou busque…" com mini-anel e microfone, notificações com contagem, avatar · título da página em negrito.
- Ícones novos: `notificacao` (sino com ponto), `configuracoes` (dois controles deslizantes). Funcionais: **34**.
Status: **aguardando revisão**.

---

## REVISÃO DE CONSISTÊNCIA (2026-10-26)
Leitura completa do arquivo + prévias. Resultado: **a base é coerente**, mas há **itens desatualizados**, **3 contradições reais** e **alguns buracos**. Abaixo, cada um com a correção proposta.

### A. Textos desatualizados (só corrigir no documento final, sem decisão nova)
1. A0 "Referências (pendente)" e "direção natureza × cyberpunk em aberto" → **resolvido**: escuro bio-tech + símbolos de natureza (híbrido).
2. A1 "Escuro: ação = `#808F12`" → vale **`#C3D14A`** (pressionado `#A8B81A`).
3. A2/A4 "Display 200–300 para título de tela" → **título de página = Outfit 700**; display fino só para números, dias grandes e saudações.
4. A7 "funcionais = silhueta cheia, sem traço" → o que foi feito e aprovado é **traço grosso arredondado (igual ao lote 1 de símbolos), convertido em forma cheia**.
5. B5 "biblioteca de ícones não decidida / lucide provisório" → **conjunto próprio Nipëi** (34 funcionais + 114 símbolos).
6. comp-09 "mensagem da pessoa em pílula com contorno" → **balão tonal** (sem contorno); Pinu em balão verde.
7. Escala de tamanhos proposta antes (24/18/15/13/12/32) → **obsoleta** depois do título 40–64 px; refazer.
8. Status "aguardando" em seções já respondidas (B12–13, chat, agenda) → atualizar.
9. "Símbolo 18": existe no lote 1 (espiral ✅) e no lote 2 (chakana ❌). **Sempre citar com o lote**: `simbolo-18` × `simbolo2-18`.

### B. Contradições reais (precisam de decisão)
1. **"Sem cinza novo" × prévias**: o tema claro usou `#F5F5F5`, `#EDEDED` e `#6B6B6B`, que não estão na paleta.
   - Motivo: no claro faltam degraus de superfície, e `#858585` não passa como texto pequeno (3,7:1).
   - Proposta: **ampliar a escala neutra** oficialmente: claro `#FFFFFF · #F5F5F5 · #EDEDED · #DEDEDE · #B3B3B3 · #858585 · #6B6B6B · #424242 · #1A1A1A`. Texto terciário no claro = `#6B6B6B` (5,3 no branco · 4,9 em `#F5F5F5` · 4,6 em `#EDEDED`; **não usar sobre `#DEDEDE`**, dá 3,96).
2. **"Um acento preenchido por tela" × prévias**: na Agenda aparecem juntos o botão "Novo evento", o dia escolhido e o hoje do mês, todos em acento.
   - Proposta: a regra vale para **conteúdo** (um cartão / KPI / bloco em destaque por tela). **Controles** (ação principal, item selecionado, interruptor ligado) não contam.
3. **"Brilho = IA" × campos**: o brilho ao passar/focar nos campos não é IA.
   - Proposta: manter como **única exceção**, chamada "brilho de interação", só em campos de texto (hover e foco).

### C. Buracos (precisam de decisão)
1. **Orbe na barra do celular**: as referências e a análise dizem **centro**; a prévia de botões colocou **no fim**, fundido por ponte líquida. Escolher um.
2. **Cantoneiras HUD**: adotadas como gesto da marca, mas **nenhum componente usa** (o foco virou anel de acento). Proposta: usar em **seleção** (item escolhido no modo "selecionar em lote", símbolo escolhido numa grade, foco por teclado em cartões).
3. **Formas de assinatura** (pétala/folha, recorte, cantoneira, ponte líquida, corte diagonal, ponta de seta): falta regra de uso para não virar excesso. Proposta:
   - **folha** = só a ação principal;
   - **pétala** = etapa atual e bloco de destaque;
   - **recorte** = cartões com ação rápida;
   - **cantoneira** = seleção;
   - **ponte líquida** = só na barra do celular e controles de mídia;
   - **corte diagonal** = botão "Continuar";
   - **ponta de seta** = última etapa.
4. **Ícones de "Semana" e "Mês"** nas abas da Agenda usam ícones emprestados (tarefa, ⋯). Desenhar `semana` e `mes` (P2).
5. **Selo de Finanças**: não existe no lote 1 (o candidato era do lote 2, e não se deve misturar lotes no menu). Proposta: lote 1 `simbolo-46` (semente).

### D. Ajustes técnicos (corrigir sem decisão)
1. **Texto mínimo 12 px no celular** (regra do inventário): as prévias usam 10–11 px em rótulos em maiúsculas, iniciais de avatar 24 px e contadores. Subir para 12 px no celular (11 px só no computador).
2. **Área de toque ≥ 44 px**: círculo de concluir (26 px), ⋯ (26 px) e ações do chat (34 px) ficam com o desenho menor, mas a **área clicável de 44 px**.
3. **Escala de raios** (hoje há 8, 12, 16, 18, 20, 22, 24, 28 espalhados). Proposta de tokens:
   - `pílula 999`
   - `moldura 28` (moldura de blocos, painel do Pinu)
   - `bloco 20` (tile, cartão com recorte)
   - `cartão 16` (celular) / `12` (computador e elementos internos)
   - `folha 8 + 28` (cantos alternados)
   - `balão 18` (com o canto da origem em 6)
4. **Folha**: as prévias usaram 8/26, 8/28, 12/32. Fixar **8 / 28**.
5. **Cor de equipe × estado**: Guardiões (`#E37AB0`) fica perto do vermelho de erro, e Manutenção (`#8FA6B8`) perto do azul de info. Funciona porque equipe sempre vem com **selo + nome**, e estado sempre com **ícone + texto**. Regra: **nunca usar só a cor** para comunicar equipe ou estado.
6. Biblioteca de ícones (ferramenta): o chip ativo usa acento preenchido, diferente do sistema (tonal + ✓). Alinhar.
7. `ICONES.md`: atualizar contagens (34 funcionais feitos, lista P2/P3 restante).

### E. Confirmado como coerente
Paleta e contrastes (todos os pares de texto usados ≥ 4,5:1, exceto o caso de B1) · tipografia (2 famílias, sem monospace) · plano/sem sombra · contorno só como **estado** (ativo, foco, erro), nunca como variante de botão · "Remover" nunca vermelho fora do diálogo · todo botão com ícone · pétala + recorte + cantoneira como formas da marca · brilho = IA · hachurado = planejado (usado de forma consistente em barra, segmentos, selo pendente, kanban, botão "adicionar") · celular primeiro com densidade maior no computador · Pinu (nome, orbe, estados, balão verde, cartão de proposta).


### Aprovação da revisão (2026-10-26)
✅ Ashuan aprovou as propostas B1–B3 e C1–C5 da revisão de consistência:
1. Escala neutra ampliada (`#F5F5F5`, `#EDEDED`, `#6B6B6B` no claro; texto terciário claro = `#6B6B6B`, nunca sobre `#DEDEDE`).
2. "Um acento por tela" vale para **conteúdo**; controles não contam. Regra **confirmada** (deixa de ser provisória). Hachurado = planejado também **confirmado**.
3. Brilho = IA, com **uma exceção**: brilho de interação em campos (hover/foco).
4. Orbe do Pinu **no centro** da barra do celular.
5. Cantoneiras HUD = **seleção** (lote, foco por teclado em cartões, item escolhido numa grade).
6. Regras de uso das formas de assinatura (ver design system).
7. Selo de Finanças = `simbolo-46` (semente, lote 1).
Ajustes técnicos D1–D7 aplicados no documento final.
→ Documento final: `DESIGN-SYSTEM.md`.
