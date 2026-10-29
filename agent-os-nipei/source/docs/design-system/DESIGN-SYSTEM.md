# Nipëi OS — Design System

Versão 1.0 · 26 de outubro de 2026 · responsável: Ashuan

Este documento é a **fonte única** de como o Nipëi OS se parece e se comporta. Todo código novo usa estes tokens, componentes e regras. Quando algo não estiver aqui, decide-se primeiro neste documento e depois no código.

- Histórico de cada decisão (com o porquê): `design/DECISOES.md`
- Ponto de partida (como a v2 estava): `design/INVENTARIO.md`
- Ícones (lista e status): `design/ICONES.md` · biblioteca visual: `design/icones-nipei.html`
- Referências visuais: `design/referencias/`
- Prévias navegáveis de cada parte: `design/preview-*.html` (lista na seção 15)

---

## 1. Identidade

| | |
|---|---|
| Nome | **Nipëi OS** (identidade própria, separada da do Santuário Nipëihu) |
| Personalidade | preciso · minimalista · moderno · futurista · natureza · cyberpunk |
| Direção | **bio-tech escuro**: superfícies quase pretas, um acento lima/oliva, dados como protagonistas, símbolos de natureza desenhados à mão |
| Tema | **Escuro é o principal**. Existe uma versão **clara completa**; a pessoa escolhe Escuro / Claro / Sistema |
| Prioridade | **Celular primeiro** (equipes em campo). Computador = painel amplo, mais denso, fácil de navegar (gestão) |
| Assistente | **Pinu** |
| Idioma da interface | Português |

---

## 2. Regras globais

Estas regras valem em todo lugar. Se um componente parecer pedir uma exceção, a regra ganha.

1. **Texto sempre legível.** Mínimo WCAG AA: 4,5:1 para texto normal, 3:1 para texto ≥ 24 px (ou ≥ 18,66 px em negrito), ícones e bordas de controle.
2. **Plano.** Sem sombras. A separação vem da **diferença de tom** entre superfícies.
3. **Contorno não é estilo.** Nenhum botão, campo ou cartão tem borda como aparência padrão. Contorno fino aparece **só como estado**: ativo, foco, erro, seleção.
4. **Brilho = IA.** Brilho (glow) só no que é do Pinu: orbe, mini-anel, sugestões, cartão de proposta, telas do Pinu. **Única exceção:** brilho de interação muito sutil em **campos de texto** (passar por cima e foco).
5. **Um acento preenchido por tela — no conteúdo.** Só um cartão / KPI / bloco em destaque por vista. Controles (ação principal, item selecionado, interruptor ligado, dia escolhido) não contam.
6. **Hachurado = planejado / pendente. Sólido = feito.** Vale para barras, segmentos, selo "Pendente", colunas do quadro, botões de "adicionar".
7. **Todo botão tem ícone. Nunca emoji** — em nenhuma parte da interface. Botão só com ícone precisa de rótulo acessível e tooltip.
8. **Só ícones do Nipëi.** Nada de bibliotecas de terceiros (lucide etc.).
9. **"Remover" nunca é vermelho** fora do diálogo de confirmação. O único botão vermelho do sistema é o "Remover" **dentro** do diálogo.
10. **Nunca só a cor.** Equipe sempre aparece com **selo + nome**; estado sempre com **ícone + texto**.
11. **Nunca monospace.** Só Google Sans e Outfit.
12. **Celular:** texto ≥ 12 px e área de toque ≥ 44 × 44 px (o desenho pode ser menor; a área clicável não).
13. **Movimento com propósito** e respeito a `prefers-reduced-motion` (sem animação contínua quando a pessoa pede menos movimento).

---

## 3. Cor

### 3.1 Escala neutra

| Escuro (do fundo para a frente) | | Claro (do fundo para a frente) | |
|---|---|---|---|
| `#0A0A0A` | fundo | `#FFFFFF` | fundo |
| `#141414` | superfície 1 (cartões) | `#F5F5F5` | superfície 1 (cartões) |
| `#1A1A1A` | superfície 2 (campos, itens dentro de cartão) | `#EDEDED` | superfície 2 |
| `#303030` | superfície 3 (tonal, selecionado, metadados) | `#DEDEDE` | superfície 3 |
| `#424242` | linha forte / contorno de estado | `#B3B3B3` | linha forte |
| `#858585` | texto terciário, ícone inativo, desativado | `#6B6B6B` | texto terciário |
| `#B3B3B3` | texto secundário | `#424242` | texto secundário |
| `#FFFFFF` | texto principal | `#1A1A1A` | texto principal |

### 3.2 Acento

| Papel | Escuro | Claro |
|---|---|---|
| Ação / acento | `#C3D14A` | `#2A5C0B` |
| Pressionado | `#A8B81A` | `#042608` |
| Texto sobre o acento | `#0A0A0A` (11,8:1) | `#FFFFFF` (7,97:1) |
| Texto/ícone em acento | `#C3D14A` | `#2A5C0B` |
| Fundo tingido (suave) | `#1B2410` | `#EEF3E8` |
| Apoio gráfico (barras, pontos, foco) | `#808F12` | `#808F12` (nunca como texto) |
| **Destaque de conteúdo** (o "um por tela") | `#C3D14A` com texto `#0A0A0A` | **bloco escuro** `#1A1A1A` com texto `#FFFFFF` |

Origem: paleta do Ashuan `#042608 · #2A5C0B · #808F12`; `#C3D14A` e `#A8B81A` são derivados do `#808F12` para o botão do escuro ter contraste forte.

### 3.3 Estados

| Estado | Escuro texto/ícone | Escuro fundo | Claro texto/ícone | Claro fundo |
|---|---|---|---|---|
| Sucesso / feita | `#C3D14A` | `#1B2410` | `#2A5C0B` | `#EEF3E8` |
| Atenção | `#E0A526` | `#2A2010` | `#8A5A00` | `#FBF3E4` |
| Erro / atrasada | `#FF6B5E` | `#2C1514` | `#B3261E` | `#FBEAE9` |
| Informação / em andamento | `#6FA8F0` | `#121D2B` | `#1F5FAD` | `#E9F0F9` |

Todos os pares texto/fundo passam 4,5:1. Linha do "agora" na agenda = âmbar de atenção.

### 3.4 Equipes

| Equipe | Selo | Escuro | Claro |
|---|---|---|---|
| Escritório / Gestão Geral | `simbolo-13` | `#2BB3A6` | `#0F766E` |
| Produção Yawanawa | `simbolo-11` | `#A68CF0` | `#6D4AB8` |
| Guardiões | `simbolo-10` | `#E37AB0` | `#A3306B` |
| Manutenção e Logística | `simbolo-62` | `#8FA6B8` | `#4F6475` |
| (reserva) | — | `#E08A5C` | `#A3542A` |

Usos: barra lateral de cartão/evento/linha, ponto no calendário, cor do selo, fundo do avatar sem foto (iniciais em `#0A0A0A` no escuro, `#FFFFFF` no claro). Todas passam 4,5:1 como texto no respectivo tema. **Sempre com selo + nome** (Guardiões fica perto do vermelho de erro; Manutenção, do azul de informação).

### 3.5 Contrastes de referência

| Par | Razão |
|---|---|
| Escuro: `#FFFFFF` / `#B3B3B3` / `#858585` sobre `#141414` | 18,4 / 8,8 / 5,0 |
| Escuro: `#858585` sobre `#303030` | 3,6 → **não usar texto terciário sobre superfície 3** |
| Claro: `#1A1A1A` / `#424242` / `#6B6B6B` sobre `#FFFFFF` | 17,4 / 10,1 / 5,3 |
| Claro: `#6B6B6B` sobre `#F5F5F5` / `#EDEDED` / `#DEDEDE` | 4,9 / 4,6 / 3,96 → **nunca sobre `#DEDEDE`** |

---

## 4. Tipografia

Famílias: **Outfit** (títulos, números, rótulos de seção) e **Google Sans** (todo o resto).

```
https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Outfit:wght@100..900&display=swap
```

Remover do layout as fontes da v1 que não são usadas: Bricolage Grotesque, Manrope, JetBrains Mono, Caveat.

| Estilo | Família / peso | Celular | Computador | Uso |
|---|---|---|---|---|
| `titulo-pagina` | Outfit 700 | 40 | 56–64 | Título de cada página ("Tarefas", "Agenda") |
| `saudacao` | Outfit 300 | 30 | 40 | "Oi, Ashuan. *Como posso ajudar?*" (dois tons) |
| `numero-display` | Outfit 200 | 44–52 | 52–64 | KPI, dias grandes da agenda, centro do anel |
| `titulo-secao` | Outfit 600 | 19 | 20 | "Hoje", "Atrasadas", títulos de bloco |
| `titulo-cartao` | Outfit 600 | 15–19 | 15–19 | Título de cartão, de evento, do Pinu |
| `corpo` | Google Sans 400 | 15 | 14 | Texto, mensagens, linhas de lista |
| `botao` | Google Sans 600 | 16 (G) | 15 (M) · 14 (P) | Botões |
| `rotulo-campo` | Google Sans 500 | 12 | 12 | Rótulo dentro do campo |
| `meta` | Google Sans 400–500 | 13 | 12,5 | Prazo, equipe, metadados, hora |
| `rotulo-maiusculo` | Outfit 500, +0,08em | 12 | 11 | "PRINCIPAL", cabeçalho de tabela |

Regras:
- **Números em dois tons**: parte principal clara, unidade/decimal em texto terciário (`18`/`24`, `27`,`4h`).
- Algarismos tabulares (`font-variant-numeric: tabular-nums`) em tabelas, contadores e horas.
- Mínimo 12 px no celular. 11 px só no computador.
- Títulos com `text-wrap: balance`.
- A escala acima é a **v1**; afinar quando as páginas forem montadas.

---

## 5. Forma, espaço e superfícies

### 5.1 Raios

| Token | Valor | Onde |
|---|---|---|
| `raio-pilula` | 999 px | botões, chips, campos de uma linha, abas, selos, busca |
| `raio-circulo` | 50% | botões de ícone, avatar, orbe, círculo de concluir |
| `raio-moldura` | 28 px | moldura de blocos, painel do Pinu, menu expandido |
| `raio-bloco` | 20 px | bloco de atalho, cartão com recorte, etapa |
| `raio-cartao` | 16 px celular · 12 px computador | cartões, avisos, campos de várias linhas, listas |
| `raio-interno` | 12 px | elementos dentro de cartão, cartões do quadro, eventos |
| `raio-balao` | 18 px com o canto de origem em 6 px | mensagens do chat |
| `raio-folha` | 8 / 28 alternados | ação principal (folha) |

### 5.2 Espaço

Base de 4 px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`.
- Margem lateral: 16 px no celular · 24–32 px no computador.
- Entre cartões: 8–12 px · dentro do cartão: 16 px · entre seções: 32–44 px.
- Densidade: no celular, respiro; no computador, **mais colunas e tabelas compactas** (linhas de 56 px), com a mesma linguagem visual.
- **Telas sem rolagem** (hoje só o Login): a página ocupa `h-dvh` com `overflow-hidden` e se compacta pela **altura**, com as variantes de `globals.css`: `baixa:` (≤ 720 px de altura: menos espaço, botões de 48 px, sem subtítulo), `mini:` (≤ 600 px: logo em linha com o nome, sem divisor) e `deitada:` (celular deitado, ≤ 520 px: duas colunas, botões de 44 px). Área de toque continua ≥ 44 px.

### 5.3 Superfícies

Fundo → superfície 1 (cartões) → superfície 2 (campos, itens) → superfície 3 (tonal, selecionado). Elementos flutuantes (menu ⋯, diálogo) ficam **um tom acima** + contorno sutil de 1 px (`superfície 3`), sem sombra.

### 5.4 Brilho

- **IA**: `0 0 0 1px rgba(195,209,74,.10), 0 0 22px rgba(195,209,74,.10)`; orbe com brilho mais forte; gradiente verde/oliva vindo do topo nas telas do Pinu.
- **Interação em campos** (exceção): o mesmo brilho fraco no hover; no foco, anel de acento de 1,5 px + brilho.

### 5.5 Textura

- **Hachurado** (linhas diagonais finas, 135°) = planejado / pendente.
- **Padrão de selos** em 5% de opacidade: só em estados vazios de destaque e telas de entrada (login).
- Adiado: curvas de nível e textura pontilhada.

---

## 6. Formas de assinatura

Cada forma tem **um** papel. Não usar fora dele.

| Forma | O que é | Onde |
|---|---|---|
| **Folha** | cantos alternados 8/28 | **só a ação principal** da tela (ex.: "Nova tarefa", "Falar com o Pinu") |
| **Pétala** | um canto em quarto de círculo | **etapa atual** de um fluxo; bloco de destaque |
| **Recorte** | canto superior direito recortado, com botão redondo dentro | **cartões com ação rápida** (↗, lembrete) |
| **Cantoneiras HUD** | quatro "colchetes" nos cantos, em acento | **seleção**: modo selecionar em lote, foco por teclado em cartões, item escolhido numa grade |
| **Ponte líquida** | formas que se fundem por um "pescoço" curvo | **só** na barra do celular (pílula + orbe) e controles de mídia |
| **Corte diagonal** | rótulo e seta em duas peças | botão **"Continuar"** em fluxos |
| **Ponta de seta** | bloco que termina em seta | **última etapa** de um fluxo |

---

## 7. Ícones e símbolos

### 7.1 Três níveis

| Nível | Onde | Estilo |
|---|---|---|
| **Funcionais** (34) | dentro de botões, campos, menus, metadados | traço grosso arredondado desenhado à mão, convertido em forma cheia; 24 × 24 |
| **Selos** (símbolos) | menu, seções, equipes, estados vazios, atalhos | símbolos de natureza dos lotes do Ashuan (licença Magnific, uso interno) |
| **Textura** | estados vazios de destaque, login | selos repetidos em baixa opacidade |

### 7.2 Formato técnico

- SVG, `viewBox="0 0 24 24"` (funcionais), **um único caminho**, `fill="currentColor"`, sem `stroke`, sem cor fixa.
- Detalhe e vão mínimos de 2 px em 24 px. Tamanhos de uso: 14 · 16 · 18 · 20 · 22 · 24 (selos até 48+).
- Nomes em português, kebab-case. No código: `<Icone nome="lixeira" />` (gera componentes a partir de `design/icones/`).

### 7.3 Linguagem

- **Triângulo cheio = direção**: voltar ◀, avançar ▶, abrir ▼ (girar para fechar), enviar.
- **Pontos = assinatura**: no "+", na lupa, no balão de mensagem, na tarefa, no calendário, no cadeado, no sino.
- **Círculo à mão = estado**: sucesso, erro, informação. Atenção = triângulo.

### 7.4 Funcionais prontos (34)

`mais · fechar · confirmar · editar (pena) · lixeira · buscar · filtrar · enviar · baixar · mais-opcoes · abrir-fora · gerar-outra · microfone · voltar · avancar · abrir · inicio · sucesso · atencao · erro · informacao · cadeado · tarefa · prazo (ampulheta) · calendario · pessoa · pessoas · mensagem · imagem · notificacao · configuracoes · tema-escuro · tema-claro · tema-sistema`

Pendentes (P2/P3): ver `ICONES.md` — entre eles `semana`, `mes`, `copiar`, `link`, `camera`, `pasta`, `projeto`, `documento`, `objetivo`, `financas`.

### 7.5 Selos em uso (sempre citar com o lote)

| Uso | Selo |
|---|---|
| Hoje | `simbolo-27` (sol) |
| Agenda | `simbolo-14` (lua) |
| Tarefas | `simbolo-03` (broto) |
| Conhecimento | `simbolo-18` (espiral) |
| Acervo | `simbolo-54` (quadrados) |
| Pessoas | `simbolo-17` (mão) |
| Painel | `simbolo-57` (olho) |
| Finanças | `simbolo-46` (semente) |
| Pinu / IA (em menus) | `simbolo-47` (irradiação) |
| Equipes | ver 3.4 |

Regras:
- **Não misturar lotes** dentro do mesmo grupo (o menu usa só o lote 1, de traço).
- Lote 2 (silhuetas) e lote 3 servem para ilustração, estados vazios grandes e futuros selos.
- **Nunca usar** símbolos sagrados de outros povos: lote 2 `simbolo2-08, 11, 15, 18, 20, 21, 22, 38, 41, 42` (chakana, pássaro-trovão, hamsá, vaso cerimonial, porta).
- Motivos de **natureza neutros**; não imitar kene nem grafismos tradicionais Yawanawá.

---

## 8. Movimento

| O quê | Duração / curva |
|---|---|
| Hover de tom, chip, linha | 150 ms ease |
| Foco, brilho de campo | 200 ms ease |
| Painel, menu, gaveta | 220 ms ease |
| Orbe do Pinu | Repouso 9 s · Ouvindo 4 s (reage à voz) · Pensando 2,4 s (gira e encolhe) · Falando 5 s (pulsa) |
| Skeleton | brilho passando a cada 1,6 s |
| Carregando | arco girando 0,9 s |

Com `prefers-reduced-motion`: sem orbe animado, sem skeleton animado, sem arco girando (troca por texto "Carregando…").

---

## 9. Componentes base

Cada componente existe nos dois temas e nos estados: normal · hover · pressionado · foco · desativado (quando se aplica).

### 9.1 Botão

| Variante | Escuro | Claro | Uso |
|---|---|---|---|
| **Primário** | `#C3D14A` / texto `#0A0A0A` | `#2A5C0B` / `#FFFFFF` | ação principal |
| **Folha** | primário com `raio-folha` | idem | **a** ação principal da tela (só uma) |
| **Tonal** | `#303030` / `#FFFFFF` | `#DEDEDE` / `#1A1A1A` | secundário, "Remover" |
| **Fantasma** | transparente; hover `#1A1A1A` | hover `#EDEDED` | terciário, "Cancelar" |
| **Destrutivo** | `#FF6B5E` / `#0A0A0A` | `#B3261E` / `#FFFFFF` | **só** "Remover" dentro do diálogo |
| **Desativado** | `#1A1A1A` / `#858585` + ícone cadeado | `#EDEDED` / `#6B6B6B` | — |

- Tamanhos: **G** 56 px (padrão; "grande sempre que possível") · **M** 48 px · **P** 40 px (só computador denso).
- Sempre ícone + texto (ícone à esquerda; "Ver tudo ▶" à direita).
- Carregando: arco girando + "Salvando…"; o botão fica desativado.
- **Botão de ícone**: círculo 52 / 44 / 40 px, fundo tonal.
- **"+" flutuante (criar)**: círculo de 56 px no canto inferior direito, fundo claro (`t1`, tinta = fundo) — o único botão claro da tela; abre o menu de ações de criação para cima (Nova tarefa, Novo evento…). No celular fica acima da barra.
- **Botão dividido**: "Continuar" + peça com ▶, separadas por corte diagonal; cores invertidas (tonal + acento).

### 9.2 Bloco (atalho)
Moldura `superfície 1` com raio 28 e vão de 8 px; blocos `superfície 2`, raio 20. Ícone no topo à esquerda, rótulo embaixo, ponto de estado ou número no topo à direita. Hover = tom mais claro.

### 9.3 Etapas
Feita = sólida + ✓ · atual = **acento com pétala** + ▶ · próxima = **hachurada** · última = **ponta de seta**. Número da etapa em `meta`.

### 9.4 Seletor segmentado
Pílula `superfície 2` com ícones; ativo = `superfície 3` + contorno de 1 px. Uso: tema (escuro/claro/sistema), vista (lista/grade), período.

### 9.5 Campo
- Superfície tonal (`superfície 2`), **sem borda**, raio pílula (uma linha) ou 16/12 (várias linhas).
- **Rótulo dentro**, pequeno, no topo, em **texto secundário** (`t2`); texto em `t1`; placeholder em `t3` (assim rótulo e placeholder não se confundem); ajuda abaixo do texto em `meta`.
- Hover = brilho fraco · foco = anel de acento 1,5 px + brilho · erro = anel `erro` + ícone `erro` + mensagem que diz como corrigir.
- Tipos: texto, título grande (Outfit 300, 26 px), área de texto, busca (ícone à esquerda; ação à direita), seleção (valor + ▼), data (valor + `calendario`).
- **Busca do Pinu**: mini-anel à esquerda + microfone em acento à direita.
- **Sugestão do Pinu no campo**: linha abaixo do texto com mini-anel + sugestão + ✓ usar + ⟳ gerar outra.
- **Senha** (`tipo="senha"`): campo de uma linha com `type="password"`; o `type` HTML também passa direto nos outros tipos de uma linha (`number`, `email`, `time`…).
- **Compacto** (`CAMPO_COMPACTO`, exportado de `components/ds/Campo.tsx`): só dentro de linhas densas (tabela editável, barra de lote, atribuir numa lista); pílula `superfície 2`, sem rótulo visível (usar `aria-label`), 44 px no celular e 36 px a partir de `sm`.

### 9.6 Chip
- **Filtro**: pílula `superfície 2` + ícone + texto + contagem; **ativo = `superfície 3` + contorno interno sutil + ✓ em acento**.
- **Equipe**: selo na cor da equipe + nome; ativo = anel de 1,5 px na cor da equipe.
- **Metadado** (dentro de cartões): menor, `superfície 3`, ícone 14 px (prioridade, prazo, subtarefas, comentários).
- **Sugerido pelo Pinu**: fundo verde suave + mini-anel + texto em acento.

### 9.7 Badge
- **Contagem**: círculo vermelho com número (ou só ponto) no canto do ícone, com anel da cor do fundo.
- **Estado**: Pendente = **hachurado** + ampulheta · Em andamento = azul suave + enviar · Feita = verde suave + sucesso · Atrasada = vermelho suave + atenção · Nota interna = tonal + cadeado.

### 9.8 Avatar
Tamanhos 24 · 32 · 40 · 56 · 80. Foto ou iniciais (Outfit 600) sobre a cor da equipe. Ponto de acento = online. Selo da equipe no canto (56+). Grupo sobreposto (−6 px) com "+N". Linha pessoa = avatar + nome (600) + "equipe · função".

### 9.9 Cartão
- `superfície 1`, `raio-cartao`, sem borda, sem sombra.
- **Cabeçalho padrão**: [ícone em círculo] Título ······ [⋯ ou ↗].
- Variantes:
  - **KPI**: número display em dois tons + variação.
  - **Destaque** (um por tela): acento preenchido no escuro, bloco escuro no claro.
  - **Tarefa**: projeto · título · metadados · progresso · avatares · estado · ⋯.
  - **Evento**: barra da equipe · hora · título · chip da equipe · avatares.
  - **Clicável**: tom muda no hover; ↗ acende.
  - **Com recorte**: ver seção 6.
  - **Pinu sugere**: gradiente verde suave + brilho + ações.
- Grade **bento**: 3 colunas no computador, 1 no celular.

### 9.10 Aviso, diálogo e toast
- Cartão `superfície 1` com **lavagem suave da cor do estado vinda do canto superior esquerdo** (tinta, não brilho).
- Ícone em círculo da cor do estado; título `titulo-cartao`; mensagem; ações tonais; ✕.
- Progresso opcional (barra + %).
- **Diálogo de confirmação**: o mesmo cartão, centralizado, com fundo escurecido; substitui o `confirm()` do navegador. Remover: [Cancelar (tonal)] [Remover (destrutivo)].
- **Toast**: a mesma lavagem, em pílula compacta, com ícone + uma frase ("Salvo", "Sem conexão. Vamos enviar quando voltar."). Substitui as faixas verdes de "ok".

### 9.11 Abas
Um só componente que mistura três ideias:
- barra em pílula `superfície 1`, itens com ícone + texto;
- ativa = pílula `superfície 3`, ícone em acento e **ponto de acento** embaixo (sem brilho);
- contagem em pílula.

Variante **pasta**: quando a aba controla o painel logo abaixo, a ativa **se funde ao painel** (cantos invertidos). Uso: fichas (Tarefa: Detalhes / Comentários / Atividade).

### 9.12 Seção recolhível
Título de seção + contagem + ▼ (`abrir`, gira 180° quando aberta). Lembra o estado. Mesmo ritmo de `titulo-secao`.

### 9.13 Controle deslizante
Trilho em pílula `superfície 2` (64 px de altura) com pontos de marcação; parte preenchida `superfície 3` com cursor fino; **rótulo à esquerda, valor à direita**. Serve também para escolher entre opções ("Lembrete · 1 dia antes").

### 9.14 Interruptor
52 × 32 px. Desligado: trilho `superfície 3`, botão `texto terciário`. Ligado: trilho acento, botão `texto sobre acento`.

### 9.15 Linha de configuração
Agrupadas num cartão com divisor fino: "Rótulo ······ valor ▶" ou "Rótulo ······ [interruptor]".

### 9.16 Progresso
- **Barra**: 6 px, pílula, acento. Variantes: com valor · resto **hachurado** (meta planejada) · com marcador e etiqueta · **em segmentos** (subtarefas) · envio (azul).
- **Anel**: número display no centro. Tamanhos 140 · 72 · 48 · 24 (mini, dentro de linhas).
- **Semana em anéis**: um anel por dia; hoje em pílula tonal.

### 9.17 Carregando
Arco cinza girando (genérico; dentro de botões também). **Mini-orbe do Pinu** só quando a IA está pensando. Telas: **skeleton** com a forma real (avatar, título, linhas, chips) e brilho lento.

### 9.18 Estado vazio
Selo grande num círculo (`superfície 2`) · título `titulo-secao` · uma frase que diz o que fazer · uma ação com ícone. Exemplos: sol = "Nada para hoje" · quadrados = "Acervo vazio" · olho = "Nenhum resultado" · espiral = Conhecimento. Destaque: padrão de selos a 5% + selo verde.

### 9.19 Menu de ações ⋯
Cartão flutuante `superfície 2` + contorno de 1 px, raio 16, itens de 44 px com ícone + texto, divisor antes de ações sensíveis. "Remover…" abre o diálogo (não é vermelho no menu). O botão ⋯ ganha anel de acento enquanto o menu está aberto.

---

## 10. Padrões

### 10.1 Cabeçalho de página
- Rótulo pequeno com selo (equipe ou contexto).
- **Título `titulo-pagina` (Outfit 700)**.
- Subtítulo com contagens ("24 abertas · 3 atrasadas · 7 com você").
- À direita: busca (botão de ícone) + **ação principal em folha**.
- Embaixo: abas de vista + chips de filtro.

### 10.2 Busca + filtros
Campo de busca em pílula + fila de chips de filtro (rola na horizontal no celular) + chip "Filtros" que abre uma gaveta. Filtros ativos ficam no estado ativo do chip; "Limpar filtros" aparece no estado vazio de busca.

### 10.3 Linha de tarefa (lista)
`[barra da equipe 3 px] [◯ concluir] [título + selo da equipe · prazo] [metadados] [avatares] [estado] [⋯]`
- Prazo vencido em vermelho.
- **Feita**: círculo preenchido em acento com ✓, título riscado e apagado, "Concluída em 1 out".
- Agrupada por **Atrasadas / Hoje / Amanhã / …**, cada grupo com contagem.
- No celular: somem metadados e estado.

### 10.4 Cartão de tarefa (grade)
Cartão com **recorte** e botão ↗; avatar; título `titulo-cartao` 22 px; data; estado em **pílula com menu** (avatar + "Aguardando ▼"); ação rápida. Um em destaque por tela.

### 10.5 Faixa da semana
Pílulas verticais por dia (dia curto + número display + pontos = quantidade de eventos). Dia escolhido = acento. Variante em **anéis** (progresso por dia).

### 10.6 Agenda
- **Dia**:
  - faixa da semana;
  - grade de horas (linhas finas, horas em `meta`) com **linha do agora** âmbar;
  - **evento com horário = bloco tingido** com a cor da equipe + barra à esquerda + local + avatares;
  - **tarefa ou lembrete = pílula** com ícone + ponto de cor;
  - botão "+" redondo flutuante.
- **Lista por dia**: número do dia display grande e fino; hoje destacado (dia em acento); "Sem eventos" discreto.
- **Mês**: grade com **pontos na cor de cada equipe**; hoje = círculo de acento; ao tocar, a lista do dia aparece embaixo (celular) ou ao lado (computador).
- Filtros: chips das equipes. Abas: Dia / Semana / Mês.

### 10.7 Quadro (kanban)
- Uma coluna por estado (`superfície 1`) com o badge do estado, contagem e "+".
- Cartões `superfície 2`: selo da equipe · título · metadados · avatares · subtarefas · comentários.
- "Adicionar tarefa" hachurado no fim.
- Arrastar muda o estado. No celular, as colunas viram páginas deslizáveis.

### 10.8 Tabela (computador)
- Dentro de um cartão com cabeçalho padrão e período em abas.
- Cabeçalho de colunas em `rotulo-maiusculo`; a coluna ordenada fica clara com ▼ em acento.
- Linhas de 56 px, sem zebra, divisor fino, hover muda o tom.
- Números à direita (tabulares); minigráfico com ponto final (vermelho quando cai); estado em badge; ⋯.
- **No celular, cada linha vira um cartão.**

### 10.9 Linha do tempo (atividade)
- Agrupada por dia.
- Nó redondo com ícone na cor do tipo:
  - concluiu = acento;
  - comentou = azul;
  - mudou estado = âmbar;
  - pedido = cor da equipe;
  - Pinu = mini-anel.
- Texto "**Quem** fez o quê em **qual item**" · hora à direita.
- Comentário em balão · mudança de estado em badges "antes ▶ depois" · pedidos com **Aprovar / Recusar** no próprio item.

### 10.10 Navegação
- **Computador**: menu lateral **flutuante**, **recolhido por padrão** (lembra a escolha).
  - Recolhido: logo (folha) · selos · ponto vermelho = novidade · configurações · **orbe do Pinu no pé**.
  - Expandido: grupos com `rotulo-maiusculo` (Principal / Equipe) · selo + nome + contagem · botão recolher.
  - Item ativo = pílula sutil + contorno de 1 px + **barra de acento à esquerda**, sem brilho.
  - Um só nível.
  - Topo do conteúdo: campo **"Pergunte ao Pinu ou busque…"** (mini-anel + microfone) · notificações com contagem · avatar.
- **Celular**: barra inferior flutuante em pílula com **o orbe do Pinu no centro**, ligado à pílula por **ponte líquida**. Item ativo = círculo preenchido em acento. O "+" abre um menu radial com o fundo escurecido. (A barra deve crescer no futuro.)

### 10.11 Pinu
- **Orbe**: forma orgânica com gradiente `#042608 → #2A5C0B → #808F12 → #C3D14A`, brilho leve, 4 estados (seção 8). **Mini-anel** = avatar do Pinu em mensagens, campos e chips.
- **Início**:
  - fundo com gradiente verde/oliva vindo do topo;
  - selo "Pinu";
  - saudação em dois tons;
  - bento com **"Falar com o Pinu" em folha preenchida** (o destaque da tela) + 2 sugestões;
  - Recentes;
  - campo grande com + / imagem / microfone.
- **Conversa**:
  - pessoa = **balão tonal à direita**;
  - Pinu = **balão tingido de verde à esquerda**, com mini-anel + nome em cima;
  - ações da resposta: gerar outra · editar · ⋯;
  - sugestões de continuação em chips acima do campo.
- **Cartão de proposta**: gradiente verde suave + brilho · ícone + "Criar 3 tarefas" + badge "Proposta" · lista do que será feito (responsável e prazo) · **Confirmar** (primário) · **Ajustar** (tonal) · **Cancelar** (fantasma).
- **Pensando**: mini-orbe + "Pinu está pensando…" + skeleton de 2 linhas.
- Adiado: modo voz em tela cheia, o que abre primeiro (voz ou chat), textura de curvas de nível, lista "o que o Pinu sabe fazer", deslizar para confirmar.

---

## 11. Tema claro

Mesma estrutura, outros tokens (seção 3). Diferenças de comportamento:
- **Destaque de conteúdo = bloco escuro** (`#1A1A1A`), não verde.
- Botão primário verde-floresta com texto branco.
- `#808F12` nunca como texto.
- Texto terciário `#6B6B6B` nunca sobre `#DEDEDE`.
- Ícones e selos herdam a cor do texto (`currentColor`).

---

## 12. Acessibilidade

- Contrastes da seção 3 (todos os pares de texto ≥ 4,5:1).
- Foco visível em tudo que é clicável (anel de acento; cantoneiras HUD em cartões focados por teclado).
- Área de toque ≥ 44 px; texto ≥ 12 px no celular. Quando o desenho é menor (chip de 36 px, link numa linha, resumo de seção), a classe `alvo-toque` (globals.css) estende a área clicável com um `::after` invisível até 44 px, sem mudar o desenho; o `Chip` já faz isso sozinho. Não usar em elemento com `overflow: hidden` (o `::after` seria cortado: ponha o corte num `span` interno).
- Botões só com ícone: `aria-label` + tooltip.
- Estado nunca só por cor (ícone + texto); equipe nunca só por cor (selo + nome).
- `prefers-reduced-motion` respeitado (seção 8).
- Diálogos próprios com foco preso dentro e Esc para fechar.

---

## 13. Implementação

### 13.1 Tokens (CSS)

```css
:root {                       /* escuro = padrão */
  --bg:#0A0A0A; --s1:#141414; --s2:#1A1A1A; --s3:#303030; --s4:#424242;
  --t1:#FFFFFF; --t2:#B3B3B3; --t3:#858585;
  --ac:#C3D14A; --ac-press:#A8B81A; --ac-ink:#0A0A0A; --ac-text:#C3D14A; --ac-soft:#1B2410; --ac-apoio:#808F12;
  --destaque-bg:#C3D14A; --destaque-ink:#0A0A0A;
  --ok:#C3D14A; --ok-bg:#1B2410; --warn:#E0A526; --warn-bg:#2A2010;
  --err:#FF6B5E; --err-bg:#2C1514; --info:#6FA8F0; --info-bg:#121D2B;
  --eq-escritorio:#2BB3A6; --eq-producao:#A68CF0; --eq-guardioes:#E37AB0; --eq-manutencao:#8FA6B8;
  --brilho-ia:0 0 0 1px rgba(195,209,74,.10),0 0 22px rgba(195,209,74,.10);
  --foco:0 0 0 1.5px var(--ac),0 0 26px rgba(195,209,74,.16);
  --raio-pilula:999px; --raio-moldura:28px; --raio-bloco:20px; --raio-cartao:16px; --raio-interno:12px;
  --fonte-display:"Outfit",system-ui,sans-serif; --fonte-texto:"Google Sans",system-ui,sans-serif;
  color-scheme:dark;
}
@media (min-width:1024px){ :root{ --raio-cartao:12px; } }
[data-tema="claro"] {
  --bg:#FFFFFF; --s1:#F5F5F5; --s2:#EDEDED; --s3:#DEDEDE; --s4:#B3B3B3;
  --t1:#1A1A1A; --t2:#424242; --t3:#6B6B6B;
  --ac:#2A5C0B; --ac-press:#042608; --ac-ink:#FFFFFF; --ac-text:#2A5C0B; --ac-soft:#EEF3E8;
  --destaque-bg:#1A1A1A; --destaque-ink:#FFFFFF;
  --ok:#2A5C0B; --ok-bg:#EEF3E8; --warn:#8A5A00; --warn-bg:#FBF3E4;
  --err:#B3261E; --err-bg:#FBEAE9; --info:#1F5FAD; --info-bg:#E9F0F9;
  --eq-escritorio:#0F766E; --eq-producao:#6D4AB8; --eq-guardioes:#A3306B; --eq-manutencao:#4F6475;
  --brilho-ia:0 0 0 1px rgba(42,92,11,.10),0 0 22px rgba(42,92,11,.10);
  --foco:0 0 0 1.5px var(--ac),0 0 22px rgba(42,92,11,.14);
  color-scheme:light;
}
```

- No Tailwind: mapear estes tokens em `theme.extend` (cores, `borderRadius`, `fontFamily`) e **parar de escrever pares `bg-* dark:bg-*`** — o tema troca os tokens.
- Tema "Sistema" = sem `data-tema`, segue `prefers-color-scheme`.

### 13.2 O que o design system substitui (do inventário)

| Hoje | Vira |
|---|---|
| `const CARTAO` em 16 arquivos (4 variantes) | `<Cartao>` com variantes |
| Botão redefinido em 12 arquivos (8 variantes) | `<Botao variante tamanho icone>` |
| `field`/`campo` em 18 arquivos | `<Campo tipo rotulo ajuda erro>` |
| `Chip` + 3 versões locais | `<Chip tipo>` |
| Faixa verde "ok" repetida à mão | `<Toast>` |
| `confirm()` do navegador | `<Dialogo>` |
| `ErroAviso`, faixas âmbar | `<Aviso estado>` |
| Cores Tailwind soltas (`neutral`, `green`, `amber`…) | tokens da seção 13.1 |
| `system-ui` + 5 fontes da v1 | Outfit + Google Sans |
| lucide-react | `<Icone nome>` (Nipëi) |
| `text-[10px]`, `text-[11px]` | estilos da seção 4 (mín. 12 px no celular) |
| Novos | Menu ⋯, Interruptor, Tooltip, Skeleton, Estado vazio, Quadro, Linha do tempo, Pinu (orbe, chat, proposta) |

Situação em 2026-10-26: todas as linhas acima foram cumpridas na v2 (`src/app/(v2)`, `src/app/login`, `src/components/v2`). Os embrulhos de compatibilidade (`Title`, `Card`, `Chip`, `Progress`, `Empty`, `Avatar`, `initials` de `components/v2/ui.tsx`, `components/v2/Abas.tsx` e `components/v2/Recolhivel.tsx`) foram apagados: as telas importam direto de `components/ds`. Em `ui.tsx` ficam só os adaptadores de dados (`TaskRow`, `TaskList`, `Section`, `byPrazo`). As telas v1 (fora da v2) continuam com lucide e as fontes antigas (`components/fontesV1.ts`).

### 13.3 Regra para código novo
1. Nenhuma cor, raio ou fonte literal: só tokens.
2. Nenhum componente visual novo sem antes existir aqui.
3. Todo componente em claro **e** escuro, celular **e** computador, com os estados da seção 9.
4. Revisar contraste quando criar um par texto/fundo novo.

### 13.4 Verificação automática
- `npm run verificar:ds` = `scripts/verificar-ds.mjs` (falha com `arquivo:linha` se aparecer lucide, `dark:`, cor do Tailwind, hex literal, `text-[10px]/[11px]`, `confirm()/alert()`, emoji ou monospace em `src/app/(v2)`, `src/app/login`, `src/components/v2`, `src/components/ds`) + `scripts/ds-contraste.mjs` (lê os tokens de `globals.css` e confere os pares da seção 3.5 nos dois temas; o bloco "Sistema" precisa repetir o claro).
- Roda sozinho antes de todo `npm run build` (`prebuild`), inclusive no deploy (Dockerfile).
- Exceção pontual e justificada: `ds-permitido: <motivo>` na linha ou na linha anterior (hoje: o logo oficial do Google no Login e o mapa das cores antigas de equipe em `components/ds/equipes.ts`).

---

## 14. Pendente / adiado

- Escala tipográfica final (a da seção 4 é a v1).
- Uso de cada padrão em cada página (ex.: onde entra o painel direito de 3 colunas no computador).
- Pinu: modo voz em tela cheia, o que abre primeiro, curvas de nível, lista de capacidades, deslizar para confirmar.
- Ícones P2/P3 restantes (`ICONES.md`): `quadro`, `grade`, `semana`, `mes`, `copiar`, `ver`/`ocultar`, `sem-conexao`, `documento`, `planilha`, `apresentacao`, `video`, `audio`, `pasta`. No código estão com um provisório e `TODO(ícones)`.
- Barra do celular: ampliar/melhorar.
- Pulso: o ponto de cada equipe ainda usa a cor gravada no vault (`cor` da equipe), não o token `eq-*`.
- Sugestão do Pinu na Nova tarefa: o slot (`SugestaoPinu`) existe, falta o endpoint.
- Pinu ainda não recebe arquivos (sem "+"/imagem no campo).
- Painel do Notificar (ficha da pessoa) e o painel do Pinu usam sobreposição própria; falta um componente de folha/painel lateral no sistema.
- Telas v1 (fora de `(v2)`): fora do design system; lucide e as fontes antigas continuam só nelas.

---

## 15. Arquivos

| Arquivo | Conteúdo |
|---|---|
| `preview-cores.html` | paleta, estados, equipes nos dois temas |
| `preview-botoes.html` | blocos, etapas, folha, sistema de botões, barra do celular, seletor, cantoneiras |
| `preview-componentes.html` | campo, abas, aviso/diálogo/toast, botão dividido, slider, configurações |
| `preview-chips-cartoes.html` | chip, badge, avatar, cartões |
| `preview-progresso-vazio.html` | progresso, anel, carregando, vazio, skeleton |
| `preview-tarefas.html` | cabeçalho de página, linha de tarefa, cartão com recorte |
| `preview-agenda-quadro.html` | agenda (dia, lista, mês) e quadro |
| `preview-tabela-nav.html` | tabela, linha do tempo, menu ⋯, navegação no computador |
| `preview-pinu.html` | orbe e estados |
| `preview-pinu-chat.html` | início e conversa do Pinu |
| `icones-nipei.html` | biblioteca de ícones e símbolos |
| `icones/funcionais/` · `icones/simbolos/` · `icones/simbolos-2/` · `icones/simbolos-3/` | SVGs |
| `referencias/` | todas as imagens de referência usadas |

Observação: algumas prévias foram feitas antes da revisão de consistência (orbe no fim da barra do celular, rótulos de 10–11 px, raio da folha variando). **Este documento prevalece sobre as prévias.**
