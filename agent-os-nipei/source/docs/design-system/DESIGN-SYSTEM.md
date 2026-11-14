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
| Pontes (contatos, sem acesso) | `simbolo-39` | `#E08A5C` | `#A3542A` |

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
- Botão que baixa um arquivo (exportar CSV, Markdown): mesmo visual, ícone `baixar`, `download` (link comum, sem pré-carregar a rota).
- **Botão de ícone**: círculo 52 / 44 / 40 px, fundo tonal.
- **"+" flutuante (criar)**: círculo no canto inferior direito — 56 px no computador, **48 px no celular** —, fundo claro (`t1`, tinta = fundo) — o único botão claro da tela; abre o menu de ações de criação para cima (Nova tarefa, Novo evento…). No celular fica acima da barra e **some enquanto a página desce** (volta ao subir ou no topo), para não ficar por cima do que se lê.
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
- **Estado**: Pendente = **hachurado** + ampulheta · Em andamento = azul suave + enviar · Feita = verde suave + sucesso · Atrasada = vermelho suave + atenção · Nota interna = tonal + cadeado · Aviso = âmbar suave + ampulheta (ex.: "Reconectar", 10.12).

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
Variante **em cartão** (`emCartao`): sem divisor, dentro de um cartão; um **resumo** (ex.: barra de progresso) continua visível com a seção fechada. Uso: cartões de onboarding do Hoje (Primeiros passos, Organizar equipes).

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
Um item pode ser um link (`href`), uma função do navegador (`onSelect`) ou uma **ação do servidor** (`acao` + `campos`: o menu fecha, envia e atualiza a página). `soCelular`: o item só aparece abaixo de `sm` (quando a mesma ação já tem botão próprio no computador).

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
- **Ações rápidas no celular** (Hoje): a linha pode mandar as ações rápidas (foco, mudar prazo) para dentro do ⋯ abaixo de `sm` (`extraSoComputador` + itens `soCelular`), para o título ocupar a largura; no computador continuam como botões de ícone.

### 10.4 Cartão de tarefa (grade)
Cartão com **recorte** e botão ↗; avatar; título `titulo-cartao` 22 px; data; estado em **pílula com menu** (avatar + "Aguardando ▼"); ação rápida. Um em destaque por tela.

### 10.5 Faixa da semana
Pílulas verticais por dia (dia curto + número display + pontos = quantidade de eventos). Dia escolhido = acento. Variante em **anéis** (progresso por dia): anel de 48 com o número do dia no centro (tarefas do dia feitas/total), ponto azul = evento; hoje em `superfície 2`, dia escolhido com contorno de acento (o anel já é acento). No celular rola na horizontal. Uso: Hoje. **Semana vazia** (nenhuma tarefa nem evento nos 7 dias): a faixa vira uma linha fina — pílulas de 44 px com dia curto e número lado a lado, sem anel —, porque 7 anéis vazios só ocupam espaço.

### 10.5.1 Foco de hoje e tarefa rápida (Hoje)
- **Ordem de Hoje** (2026-11-14: as tarefas apareciam só depois de ~3 telas no celular): saudação + chips de pendências → Missão da semana (destaque) → Boas-vindas → faixa da semana → Foco de hoje → abas de tarefas → **depois** os cartões de configuração (Primeiros passos, Onde estou esta semana, Organizar equipes). "Organizar equipes" começa fechado (o resumo com a barra continua visível). Primeiros passos com 2 passos ou menos por fazer não vira cartão: cada passo que falta é um Chip nas pendências do cabeçalho (ícone `tarefa`). O campo do Pinu no fim da página saiu: o do cabeçalho (`BuscaPinu`) é o mesmo assistente.
- **Resumo do dia** (abaixo da saudação, `corpo text-t2`): uma linha com o que importa agora — "N atrasadas · N para hoje · N eventos hoje" (só as partes que não são zero; atrasadas em `text-err`); nada disso = "Nada pendente para hoje.".
- **Pendências: no celular, até 3 Chips por grupo** e um Chip "+N" (sem ícone) que abre o resto ali mesmo (as linhas quebram, não rolam: o que passava da borda não se via). No computador aparecem todos, quebrando linha.
- **Organizar equipes saiu de Hoje** (é trabalho de gestão, não do dia): em Hoje fica só um Chip "Organizar equipes N%" (ícone `pessoas`) em "Equipe e gestão" enquanto houver pendências; o Cartão com a barra de progresso, as contagens (sem equipe · equipes sem coordenação · sem função) e o Botão "Organizar" fica em `/pessoas`, abaixo do cabeçalho, só para a gestão e só sem filtro de equipe.
- **Resumo por equipe** (no lugar do Chip único "N atrasadas · N sem responsável"): um Chip por equipe com tarefas atrasadas ou sem responsável, com o selo e a cor da equipe (`tipo="equipe"`): "<Equipe> · N atrasadas" (ou "· N sem resp." quando não há atrasadas — um número só, para nomes longos caberem no celular; mais atrasadas primeiro; tarefas sem equipe = Chip com ícone `atencao` "Sem equipe · …"). Tocar abre o Pulso filtrado por aquela equipe (atrasadas, ou sem responsável se não há atrasadas).
- **Novidades**: Chip "N novidades" (ícone `notificacao`) em "Para você", logo depois de "esperando você", quando há novidades das últimas 24 h (o mesmo número do sino); abre a aba Novidades.
- **Pendências em dois grupos** (no lugar da fila única de Chips): **Para você** (eventos de hoje e próximos primeiro; depois, por urgência: esperando você, diagnóstico/código/seção coletiva, check-in de objetivo, fatos a revisar, primeiros passos, reconectar, prontos da IA) e **Equipe e gestão** (alertas do Conhecimento, pedidos para minhas equipes, atrasadas/sem responsável do Pulso e, para quem tem Finanças, os sinais financeiros). Cada grupo é uma linha com rótulo `rotulo-maiusculo text-t3` à esquerda e os Chips (no celular a linha rola na horizontal); grupo vazio não aparece.
- **Sinais de Finanças** (só `podeFinancas`, sem lançamentos de teste): Chip "N a pagar em 7 dias" (ícone `prazo`), "N reembolsos" (ícone `pessoa`), "Caixa negativo em DD/MM" (ícone `atencao`) e "N categorias acima de 90%" (ícone `atencao`, → orçamento anual); cada um abre a página certa de Finanças.
- **Linha da tarefa nas minhas tarefas**: no celular os Avatares dos outros responsáveis saem (aparecem a partir de `sm`), para o título caber numa linha ao lado do foco e do prazo.
- **Foco de hoje**: grupo de tarefas (10.3) com no máximo 3 linhas, acima das abas. Sem escolha = sugestão (as 3 primeiras da ordem inteligente) com `meta` "sugestão" e botão fantasma "Usar estas". A sugestão só aparece quando traz alguma tarefa que não está na aba Agora (que abre por padrão); senão repetiria as mesmas linhas logo abaixo. Nas linhas, o botão de ícone com o selo `sol` (o mesmo de Hoje no menu; `BotaoIcone selo="sol"`) põe/tira do foco; no foco, o botão vira a variante `acento` (círculo verde, `aria-pressed`).
- **Esperando você**: pílula no cabeçalho (`mensagem`, "N esperando você") que abre a aba **Esperando você** (contagem em alerta), só quando há comentários que pedem resposta minha (me mencionam ou estão numa tarefa minha e eu não escrevi depois). Mesmas linhas de Novidades.
- **Dia carregado** (faixa da semana): pílula em `warn-bg` com o dia curto em `warn` quando as abertas do dia ≥ máx(4, 2× a média da semana). Ao escolher o dia: aviso `atencao` com o dia mais leve, e a primeira opção do calendário de cada tarefa vira "Para <dia mais leve>".
- **Agenda Google na faixa**: com a conta Google conectada, ponto neutro (`texto secundário`) ao lado do azul = evento pessoal do Google; os de hoje (cabeçalho) e os do dia escolhido viram chips com o ícone `abrir-fora` (abrem no Google).
- **Dia fechado**: quando Agora fica vazia e houve tarefas concluídas hoje, aviso `sucesso` acima do foco: "Nada pendente para hoje e N concluídas." + link "Amanhã: N tarefas." (abre o dia seguinte) + os títulos feitos em `texto secundário`. Logo abaixo, **Foco de amanhã**: grupo de tarefas (10.3) com até 3 (as de amanhã primeiro, depois a ordem inteligente) e `meta` "sugestão" + Botão fantasma P "Usar como foco de amanhã" (selo `sol`); escolhido, o título fica sem "sugestão" e sem botão. No dia seguinte esse foco já aparece como o Foco de hoje.
- **Agenda de hoje (linha do tempo)**: com algum evento hoje (comunidade, reunião fixa ou Google), logo abaixo das pendências, lista em `superfície 1` arredondada: por linha, a hora (coluna de 72 px, `tabular-nums`, sem quebra; "Dia todo" quando não tem hora) e o título (link para o evento; os do Google com o ícone `abrir-fora`). O próximo evento com hora (o primeiro que ainda não começou) tem o ponto e a hora em acento; os que já passaram ficam em `t3`. Os eventos de hoje saem dos Chips de "Para você" (os próximos dias continuam como Chips).
- **Dar prazo às sem data** (Hoje): com 5 ou mais tarefas minhas sem prazo, Chip em "Para você" "N sem data · dar prazo" (ícone `prazo`) que abre `/hoje?triagem=1`: no lugar do foco, Seção "Dar prazo" com `meta` "N sem data" e as 3 primeiras (ordem inteligente), cada uma com as opções de prazo já abertas (Esta semana · Próxima semana · Este mês · Outra data); ao escolher, a tarefa sai e entra a próxima. Botão fantasma P "Pronto" (ícone `confirmar`) fecha a triagem.
- **Tarefa rápida**: no topo da aba Agora, campo em pílula (9.5, forma de busca) com `mais` à esquerda e botão de ícone em acento `enviar` à direita; Enter cria a tarefa para hoje, comigo, na minha equipe.

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
  - **Nunca sai da barra**: a altura de cada item (e de Configurações) é o token `--altura-item-menu` = `clamp(28px, 4.6dvh, 44px)` — 44 px em telas altas, encolhe com a altura da janela (zoom do navegador incluído) para caber até em 600 px.
  - Topo do conteúdo: campo **"Pergunte ao Pinu ou busque…"** (mini-anel + microfone) · notificações com contagem · avatar.
- **Celular**: barra inferior flutuante em pílula (68 px) com **o orbe do Pinu no centro** (56 px num círculo de 76 px), ligado à pílula por **ponte líquida**; 2 itens de cada lado. Cada item = ícone 22 px dentro de um **indicador em pílula 56×32** + **rótulo de 12 px** embaixo. Ativo = indicador `ac-soft` com ícone `ac-text` e rótulo `t1` semibold; inativo = ícone `t2`, rótulo `t3`, sem fundo. Toque: `active:scale-95`. As outras seções ficam no painel do avatar. O "+" abre um menu radial com o fundo escurecido.

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

### 10.12 Contato (Pontes)
Pessoas da equipe **Pontes** (`contatos: true`): fornecedores, aliados possíveis, colaboradores. Não entram na plataforma; não são responsáveis de tarefas.
- **Cartão de contato** (grade bento na equipe Pontes): cartão clicável com barra lateral da cor da equipe · Avatar 40 + nome (`titulo-cartao`) · linha `meta` "empresa · tipo" · até 3 Chips de filtro com o que **oferece** (+N) · pé com o Avatar 24 do **vínculo** e a data da última conversa (`meta`). Passou do prazo de reconectar → BadgeEstado "aviso" "Reconectar" (âmbar + ampulheta, 9.7) no lugar da data.
- Filtros: busca (10.2) + chips de tipo (Todos / Fornecedor / Aliado possível / Colaborador).
- **Ficha do contato**: abas Ponte · Perfil · Gestão (sem Resumo, Tarefas nem números). Aba Ponte = Cartão com lista de definição (tipo, empresa, oferece em Chips, como conhecemos, vínculo, próximo passo, reconectar a cada N dias) + botão "Editar" tonal; Cartão "Conversas" com o formulário curto (data, texto, botão "Registrar conversa" com ícone `confirmar`) e a Linha do tempo (10.9) das conversas.
- **Hoje**: Chip "Reconectar com X" (ícone `pessoa`) junto às pendências, só para o vínculo (sem vínculo: coordenação de Pontes); toque abre a ficha.

### 10.13 Sobre a equipe
Primeira aba da página da equipe. Quatro Cartões em grade bento (2 colunas a partir de `sm`): **Propósito** · **O que decide** · **O que não faz** · **Como pedir**, cada um com rótulo `rotulo-maiusculo` e texto `corpo`. Coordenação e gestão veem "Editar" (Botão tonal com ícone `editar`) no topo da aba → página com os quatro Campos área de texto. Sem nada escrito: Estado vazio (selo da equipe) com a ação "Escrever" para quem pode editar; os outros veem só a frase.

### 10.14 Pedidos à equipe
Quem não sabe a quem pedir, pede à equipe.
- **Pedir algo**: Botão de ícone `enviar` (rótulo "Pedir algo") no cabeçalho da equipe, junto de Reunião e Pessoas, e item no "+" de Hoje → página com Campo seleção de equipe (quando não veio da equipe), Campo título "O que você precisa?", Campo área "Detalhes" e Campo data "Até quando?" (opcional). Primário "Enviar pedido" (ícone `enviar`).
- **Aba Pedidos** (só coordenação/gestão; contagem em pílula, `alerta` quando há novos): linhas de tarefa (10.3) com quem pediu e quando (`meta`), o seletor "Atribuir a…" e "Recusar" (Botão fantasma) que abre, na própria linha, o Campo "Motivo" + "Recusar pedido" (o Diálogo de confirmação não tem campo de texto).
- **/pedidos**: "Para minhas equipes" (coordenação) e "Meus pedidos" (quem pediu). Estado com BadgeEstado: Pendente (novo) · Em andamento (atribuído, com o nome) · Feita · Atrasada (passou do "até quando") · Recusado = estado "interna" com o texto "Recusado" e o motivo em `meta`.
- Hoje: Chip "N pedidos para sua equipe" (ícone `enviar`) para a coordenação.

### 10.15 Saúde da equipe (cartão de `/equipes`)
Abaixo da barra "% em dia": `Sparkline` (10.8) das últimas 8 semanas com o % de tarefas concluídas no prazo em cada semana + texto `meta` "No prazo · 8 semanas" e a tendência **sempre em texto** ("melhorando", "estável", "caindo"; caindo em `text-warn`). Menos de 2 semanas com dados → só "Sem histórico ainda".

### 10.16 Reunião fixa da equipe
Na aba Configuração da equipe, Cartão "Reunião fixa": Campo seleção do dia da semana (ou "Sem reunião fixa") + Campo hora + Primário "Salvar". A reunião aparece na Agenda como evento da equipe (mesma tinta da equipe, 10.6) que abre a pauta ao vivo (`/equipes/[id]/reuniao`), e em Hoje como Chip de evento (ícone `calendario`, hora em negrito) para membros e coordenação.

### 10.17 Procedimentos da equipe
Aba **Procedimentos** da equipe: lista de Cartões — título (`titulo-cartao`) · quando roda em `meta` ("Toda segunda", "1 dia antes de eventos com 'retiro'", "Manual") · nº de passos · responsável (Avatar 24) · ações "Gerar agora" (tonal, ícone `tarefa`) e "Editar" (fantasma, ícone `editar`). Coordenação/gestão vê "+ Novo procedimento". Página de edição: Campo título, Campo seleção "Quando" (Manual / Toda semana / Antes ou depois de um evento), campos do gatilho (dia; dias antes, negativo = depois; palavra no título do evento), Campo seleção responsável (opcional), Campo área "Passos" (um por linha), Primário "Salvar" e "Arquivar" (fantasma). Cada vez que roda vira uma tarefa da equipe com o checklist; nunca duas vezes para o mesmo dia/evento. Sem procedimentos: Estado vazio com "Novo procedimento".

### 10.18 Onde estou esta semana (presença)
Linha de 7 dias (segunda → domingo) em pílulas de 44 px: inicial do dia em cima, estado embaixo; tocar cicla **—** → **Santuário** (acento suave + ícone `inicio`) → **Remoto** (tonal + ícone `mensagem`) → **Fora** (hachurado + ícone `fechar`). No celular só o ícone (o nome do estado fica no rótulo acessível); o texto aparece a partir de `sm`. Hoje = anel de acento. Em Hoje fica num Cartão recolhível "Onde estou esta semana" (9.12 em cartão; o resumo fechado mostra quantos dias no Santuário) com "Igual à semana passada" (tonal) quando a semana está vazia. Na equipe (aba Membros, topo): faixa da semana (10.5) com, por dia, os Avatares 24 de quem está no Santuário (+N) e a contagem de remotos; a coordenação abre "Marcar a semana" (`/equipes/[id]/semana`) com uma linha por membro.

### 10.19 Conhecimento da equipe
A aba **Conhecimento** da equipe (antes "O que sabemos") tem três blocos, nesta ordem: **Para revisar** (só para quem pode revisar: Cartão com o número em `numero-display` + Primário "Revisar um por um" → `/conhecimento/revisar?equipe=`; zero → some), **O que a IA não soube** nos temas da equipe (lista: pergunta · "N vezes" em `meta` · "Perguntar à comunidade" tonal; até 5; vazio → some) e **O que sabemos** (a lista de fatos confirmados de sempre, 10 + "Ver na base"). Contagem da aba = fatos para revisar (com `alerta`) para quem revisa; para os outros, os confirmados.

### 10.20 Boas-vindas à equipe
Quem entra numa equipe vê em Hoje um Cartão destaque suave (variante `pinu`, sem brilho de IA no título) "Bem-vindo à <equipe>": Propósito e Como pedir (do Sobre), a coordenação (Avatares 24 + nomes), os procedimentos da equipe (lista curta), até 5 fatos confirmados mais usados (`corpo`, cada um abre o fato) e dois botões: "Abrir a equipe" (primário) e "Entendi" (fantasma, ícone `confirmar`, tira o cartão). Um cartão por equipe nova; some sozinho depois de 30 dias. Contatos (Pontes) não recebem.

### 10.21 Projetos (portfólio, ficha e "sem projeto")
- **Portfólio** (`/projetos`): grupos por estado — Ativos, Ideias, Pausados (recolhível) e Concluídos (recolhível). Cartão clicável: nome (`titulo-cartao`) · BadgeEstado do estado (ativo = andamento, ideia = pendente/hachurado, pausado = interna, concluído = feita) · Avatar 24 do **líder** · equipes em Chip de equipe · abertas / atrasadas / sem responsável em `meta` · Sparkline "No prazo · 8 semanas" (10.15) · **parado** (sem tarefa mexida nem atualização há 21 dias) = BadgeEstado "aviso" "Parado há N dias". Cabeçalho: "Novo projeto" (primário, folha, gestão) e, quando há, Botão tonal "N tarefas sem projeto" → triagem.
- **Ficha**: o rótulo do cabeçalho mostra estado · líder; antes dos números, Cartão **Sobre** com Objetivo / Para quem / Como medimos (rótulo `rotulo-maiusculo` + `corpo`), com "Editar" (fantasma) para quem pode; vazio → uma linha `meta` "Sem objetivo escrito" + "Escrever".
- **Editar / novo projeto**: Campo título (nome), área (descrição), Chips de marcar das equipes, seleção líder, seleção estado, datas início/fim, três Campos área do Sobre; Primário "Salvar".
- **Sem projeto** (`/projetos/sem-projeto`): tarefas abertas sem projeto agrupadas por equipe; cada linha = título + Campo compacto (seleção) do projeto. "Sugerir com o Pinu" (cartão `pinu`, ícone `gerar-outra`) pré-seleciona a sugestão da IA com o Chip `pinu` "sugerido"; nada muda até "Salvar projetos" (primário). Só aparecem as tarefas que a pessoa pode editar. Chips no topo: "Só sem projeto" e "+ <projeto>" (até 4, os que têm mais tarefas abertas) para redistribuir também as tarefas de um projeto genérico.
- **Fatos por projeto** (`/conhecimento/projetos`, gestão): o mesmo padrão do "sem projeto" sobre os fatos confirmados e propostos (texto do fato em `corpo`, até 3 linhas, abre o fato; outros projetos do fato em `meta`). Atalho no fim da triagem de tarefas e no Mapa do conhecimento.
- **Projeto privado**: só gestão, as equipes do projeto e o líder veem (lista, ficha, visão, seletores, Pinu). BadgeEstado "interna" (cadeado) "Privado" no cartão e "Privado" no rótulo da ficha. As tarefas continuam visíveis para a equipe de cada tarefa (quem trabalha nelas).

### 10.22 Objetivos (resultado, meta e check-in)
Um objetivo é um **resultado com prazo**: título como resultado, **responsável** (uma pessoa), **prazo**, projeto e a meta — **número** (inicial → alvo, unidade) ou **marcos** (3 a 6). O avanço vem da meta (número ou marcos feitos); sem meta, das tarefas ligadas.
- **Ritmo** (calculado pela data e pelo avanço), sempre BadgeEstado com texto: Em ritmo (`feita`, verde) · Em risco (`aviso`, âmbar: avanço mais de 20 pontos abaixo do esperado para a data) · Atrasado (`atrasada`, vermelho: passou do prazo sem concluir) · Concluído (`feita`) · Sem prazo (`pendente`, hachurado).
- **Lista** (`/objetivos`): Segmentado Ativos / Fechados + chips de equipe; cartões por prazo (o mais próximo primeiro): título · BadgeEstado do ritmo · Avatar 24 do responsável · prazo e projeto em `meta` · BarraProgresso com rótulo ("3 de 8 retiros", "2 de 5 marcos") · rótulo "Check-in →" em `text-ac-text` (o cartão inteiro já é link para a ficha, onde está o check-in) quando é a pessoa responsável e a última atualização tem mais de 7 dias. O cartão abre a ficha.
- **Ficha** (`/objetivos/[id]`): cabeçalho com ritmo · responsável · prazo; Cartão **Check-in** (para o responsável e a gestão): Campo número "Valor atual" (meta numérica) ou a lista de marcos com caixas, Campo área "O que avançou?", Primário "Registrar check-in"; histórico dos check-ins em Linha do tempo (10.9); tarefas ligadas (10.3) + "Nova tarefa"; Editar (fantasma) e "Fechar objetivo" (fantasma, com motivo).
- **Editar / novo**: Campo título, área (descrição), seleções projeto, responsável, equipe dona, datas início/prazo, Segmentado "Como medimos" (Número / Marcos) com os campos correspondentes (inicial, alvo, unidade · marcos, um por linha).
- **Hoje**: Chip "Check-in: <objetivo>" (ícone `confirmar`) para o responsável quando a última atualização tem mais de 7 dias.

### 10.23 Pessoas: papel, "referente de", responsabilidades e "Completar fichas"
- **Papel** = o cargo real da pessoa no Santuário ("Coordenadora de retiros", "Engenheiro e arquiteto"); um só campo (o antigo "área" foi unificado nele). **Referente de** = temas em que a pessoa é a referência (Chips de metadado).
- **Ficha → Resumo**: Cartão **Responsabilidades** primeiro: papel (`titulo-cartao`), "Referente de" (Chips), e linhas `corpo` com link para o que a pessoa coordena (equipes), lidera (projetos), é responsável (objetivos ativos, com BadgeEstado do ritmo) e cuida (procedimentos); "Esta semana" com a presença (10.18, só leitura). Gestão e a própria pessoa veem "Editar" (fantasma) que abre, no próprio cartão, Campo papel + Campo "Referente de" (separado por vírgulas) + Primário "Salvar".
- **Completar fichas** (`/pessoas/completar`, gestão): números do que falta no topo (Chips de filtro: Sem papel · Sem equipe · Sem WhatsApp · Sem referente, com contagem); uma linha por pessoa (Cartão no celular, linha densa no computador): Avatar 24 + nome (link) · equipes em Chip · Campos compactos papel, equipe (só para quem não tem: "Adicionar à equipe…"), WhatsApp, e-mail, referente de. "Sugerir com o Pinu" (cartão `pinu`) pré-preenche só os campos vazios com Chip `pinu` "sugerido"; nada é gravado até "Salvar fichas" (primário, fixo no pé). Contatos de Pontes e externos não aparecem.

### 10.24 Plano de trabalho (Acervo → "Agenda work plan", só gestão)
O que a equipe tem de entregar a partir de um diagnóstico (hoje o da Lynn), como checklist visual. Abas no cabeçalho do Acervo (9.11): "Arquivos" e "Agenda work plan" (esta aba só existe para a gestão).
- **Resumo** (Cartão padrão): AnelProgresso 72 com o % geral · linha `corpo` "N de M respostas e entregas" · rascunhos na mesma linha · `meta` "Respondem: nomes" (sem avatares de iniciais) · ações: Botão tonal "Exportar CSV" e fantasma "Exportar EN", ícone `baixar`, com `download`; a partir de 1024 px o Resumo e o cartão Pedir respostas ficam lado a lado; "Abrir diagnóstico" (fantasma) leva ao `/diagnosticos/[id]`.
- **Seções** na ordem do documento original, cada uma uma Seção recolhível (9.12) em cartão: título "N. Seção" + contagem "feitas/total"; o resumo fechado mostra a BarraProgresso (sólido = feito; rascunhos não contam). Dentro, uma linha por pergunta: BadgeEstado (Feita = todas respondidas · Em andamento = alguém respondeu ou há rascunho · Pendente = ninguém, hachurado) · texto da pergunta (`corpo`) · `meta`: individual "3/6 · faltam: PPR, Rodrigo"; coletiva "Responsável: X" ou "Sem responsável" + a lacuna escrita. Nunca o texto das respostas.
- **Entregas** (Cartão): mesma linha com BadgeEstado + nome da entrega + detalhe em `meta` (período, nº de itens, versão e aceites, PT/EN); cada linha abre a página onde se faz.
- **Pedir respostas** (Cartão, logo abaixo do resumo, só quando falta alguém): uma linha `meta` por pessoa com o que falta dela (nome em semibold; quem não recebe em `text-t3` com o motivo: acesso suspenso ou sem WhatsApp) · Campo data "Responder até" (padrão: daqui a 3 semanas) · Botão primário "Pedir respostas" (ícone enviar) que abre o Diálogo (não perigoso) com os nomes antes de enviar. Resultado em Toast.
- Vazio (nenhum diagnóstico do modelo): Estado vazio 9.18 com selo olho.

### 10.25 Finanças: pendentes, orçamento do período e exportação
- **KPIs** de `/financas` mostram reais sem centavos (os centavos ficam na lista); número `text-2xl md:text-3xl` para nunca cortar em 2 colunas. Só contam lançamentos já pagos/recebidos.
- **Pendente** = lançamento "a pagar" (despesa) ou "a receber" (entrada) ainda não quitado. No formulário: linha com Interruptor (9.14) "Ainda não pago / recebido". Na lista do mês: BadgeEstado `pendente` "A pagar" / "A receber" ao lado da descrição. Bloco **Pendentes** (Seção, antes de "Por categoria", só se houver; todos os meses): linha com data, descrição, valor colorido e Botão tonal M "Pago" / "Recebido" (ícone confirmar) que quita (o lançamento mantém a data dele, que é a do retiro; grava quem e quando quitou).
- **Diagnóstico → Revisão financeira** (painel do período): abaixo das datas, Tabela 10.8 por categoria com colunas Orçado · Real · Diferença (diferença em `text-err` quando a despesa passou do orçado ou a entrada ficou abaixo; em `text-ok` no contrário); quem edita a seção vê Orçado como Campo compacto numérico e um Botão tonal "Salvar orçamento". Linhas: quem edita vê todas as categorias (para planejar); quem só lê vê as com orçamento ou movimento no período. A categoria leva antes o tipo em `meta` (Entrada em `text-ok`, Despesa em `text-err`). Abaixo: `meta` "Pendentes: R$ X a receber · R$ Y a pagar" e Botão fantasma M "Baixar CSV do período" (ícone baixar, `download`).
- **Evento e participante** (opcionais em todo lançamento): no formulário, Campo "Evento" (texto curto com sugestões dos eventos já usados, `<datalist>` nativo; ex.: "Retiro outubro 2026", "Dieta outubro 2026") e Campo "Participante" (quem pagou, para entradas de inscrição). Na lista do mês, o evento vai em coluna `soComputador` e o participante depois da descrição, em `meta`. Em `/financas`, Seção **Por evento** (todos os meses; só se houver): Tabela 10.8 Evento · Entradas · Despesas · Resultado · A receber.
- **Importar planilha** (`/financas/importar`, gestão; Botão fantasma "Importar planilha" com ícone `mais` nas ações do cabeçalho de `/financas`): passo 1 = `Upload` só de arquivo (`soArquivo`, sem o botão de foto) para CSV/TSV + Botão fantasma "Baixar modelo" (`download`) + `meta` com as colunas aceitas e "Excel/Sheets: salve como CSV". Passo 2 (prévia, nada gravado ainda): `meta` "N linhas · X prontas · Y com aviso · Z ignoradas"; Tabela 10.8 Data · Descrição · Categoria · Evento · Valor (verde/vermelho) · Situação, com BadgeEstado na descrição: `aviso` "categoria trocada"/"sem data", `pendente` "a pagar/a receber", `interna` "repetido" (já existe igual; não entra) e `atrasada` "erro" (data ou valor ilegível; não entra); na coluna Categoria, cada linha que vai entrar tem um Campo compacto de seleção (9.2) com as categorias do tipo dela, já com a lida (ou "Outras …"), visível também no cartão do celular; linhas com erro ou repetidas mostram só o texto. Campos seleção "Projeto" e texto "Evento" (vale para as linhas sem evento); Botão primário "Importar N lançamentos" e fantasma "Cancelar". Depois: Toast "N lançamentos importados" e, em `/financas`, cada importação recente vira uma linha `meta` "Importação de <data> · N lançamentos" com Botão fantasma P "Desfazer" (anula todos dela, com Diálogo perigoso).
- **Diagnóstico → Revisão financeira**, depois do orçamento: Tabela "Por evento" (mesmas colunas, só o período) e Tabela **Pagamentos dos participantes**: Participante · Evento · Pago · A receber (A receber em `text-warn` quando > 0), mais quem pagou mais primeiro; título com contagem "N participantes · M com saldo a receber".
- **Ficha do lançamento** (`/financas/[id]`, gestão): a descrição na lista do mês e nos Pendentes é um link para ela; quem tem comprovante mostra o ícone `imagem` (16 px, `text-t3`, com `aria-label`) depois da descrição. A ficha tem `CabecalhoPagina` (rótulo "Gestão · Finanças", título = descrição, `meta` com tipo, valor colorido e data; ação Botão fantasma "Finanças" com ícone voltar) e, em coluna única `max-w-2xl`: (1) Cartão **Comprovante**: foto em miniatura (`rounded-interno`, até 320 px de altura, abre o arquivo inteiro) ou, para PDF, Botão tonal "Abrir PDF" (ícone abrir-fora); abaixo, `Upload` com arquivo + foto (câmera traseira no celular) "Anexar comprovante" / "Trocar comprovante"; foto vira JPEG sem EXIF; PDF, JPG, PNG, WebP ou HEIC até 10 MB. (2) **Editar**: o mesmo formulário do "Novo lançamento", já preenchido, Botão primário "Salvar alterações"; só muda o que foi mudado, cada mudança vai ao histórico. (3) **Histórico**: `LinhaDoTempo` (10.9) com "registrou", cada campo alterado como antes ▶ depois, comprovante anexado/trocado, quitado e anulado. (4) Botão fantasma perigoso "Anular lançamento" com Diálogo. Lançamento anulado: Aviso `atencao` "Anulado em <data>" no topo e nada editável (só comprovante e histórico para consulta).
- **Registrar com o Pinu** (gestão; painel, WhatsApp e MCP): "gastei 120 de gasolina para o retiro" vira o mesmo cartão de proposta do Pinu (Confirmar / Ajustar / Cancelar; no WhatsApp, sim/não). Título do cartão "Despesa R$ 120,00: Gasolina" (ou "Entrada …"); detalhe em uma linha: data · categoria · evento · participante · "a pagar"/"a receber" · projeto. Confirmado, o link do cartão abre a ficha do lançamento, e o histórico da ficha diz "registrou o lançamento (via Pinu/WhatsApp/<app>)".
- **Comprovante pelo WhatsApp** (gestão com o Pinu): foto ou PDF com legenda de gasto ("gasolina 145,50 retiro", "paguei 300 de feira") vai ao Pinu, que propõe o lançamento; ao confirmar (sim, ou no app), o arquivo vira o comprovante e a resposta diz "📎 Comprovante anexado ao lançamento". Foto sem legenda: a pergunta "Guardo no Conhecimento?" ganha "Se for um comprovante, responda com o gasto (ex.: *gasolina 120 para o retiro*)"; responder com um gasto segue o mesmo caminho. Legenda só "recibo"/"comprovante": anexa ao último lançamento sem comprovante que a pessoa registrou nas últimas 2 h (responde qual, com o link); se não houver, guarda e pede o gasto. O arquivo espera até 2 h; legenda com *conhecimento:* continua indo ao Conhecimento. **A IA lê o comprovante**: toda foto/PDF da gestão (não encaminhado) passa pela leitura; se for recibo, nota, cupom ou comprovante de Pix com valor legível, vai direto ao Pinu com valor, data, estabelecimento e itens lidos (mesmo sem legenda) e a pessoa só confere o cartão; se não for, segue a pergunta do Conhecimento. **Lembrete semanal de pendentes**: segunda (8–20 h, Bahia), um WhatsApp à gestão com "Finanças da semana", *A pagar: R$ X* e *A receber: R$ Y* em negrito, até 5 linhas cada ("• R$ 600 — Participante (Evento) · 20/10", "• e mais N") e o link de /financas; nada pendente = nenhuma mensagem.
- **Previsão de caixa** (`/financas`, logo abaixo dos KPIs, antes de "Novo lançamento"): Seção "Previsão de caixa" com 3 Cartões `kpi` lado a lado (2 colunas no celular, o terceiro quebra): "Hoje" (saldo dos lançamentos pagos/recebidos até hoje), "Em 30 dias" e "Em 60 dias"; cada um com o número display (`text-err` se negativo) e, nos de 30/60, uma linha `meta` "+R$ X a receber · −R$ Y a pagar · −R$ Z fixos". Pendentes com data passada contam como já devidos. Se o saldo previsto ficar negativo em algum dia da janela de 60 dias, Aviso `atencao` acima dos cartões: "O caixa fica negativo em DD/MM (−R$ X)". Sem nada pendente nem fixo, só o cartão "Hoje".
- **Gastos fixos** (`/financas/fixos`, gestão; Botão fantasma "Gastos fixos" com ícone `calendario` nas ações do cabeçalho de `/financas`): `CabecalhoPagina` com subtítulo "Custo fixo mensal: R$ X" (e "· entradas fixas R$ Y" se houver). Tabela 10.8 Descrição · Dia · Categoria · Valor (verde/vermelho) com BadgeEstado `interna` "pausado" nos inativos (linha `apagada`); ações por linha: BotaoIcone `editar` (abre o formulário preenchido, `?editar=<id>`) e Botão fantasma P "Pausar" / "Reativar". Abaixo, Cartão com o formulário (título "Novo gasto fixo" ou "Editar gasto fixo"): tipo (os mesmos dois chips de Despesa/Entrada), Descrição, Valor, Dia do mês (1–28), Categoria, Projeto, "Começa em" (mês) e Botão primário "Salvar". Todo mês, cada fixo ativo vira um lançamento pendente na data do dia escolhido (a pagar / a receber; até 3 meses para trás se ninguém abriu o app), marcado na lista do mês com BadgeEstado `interna` "fixo" ao lado do pendente.
- **Contas** (`/financas/contas`, gestão; Botão fantasma "Contas" com ícone `abrir` (provisório: falta o ícone carteira, ICONES.md) nas ações do cabeçalho de `/financas`): `CabecalhoPagina` com subtítulo "Saldo nas contas: R$ X". Tabela 10.8 Conta · Tipo · Saldo hoje (negativo em `text-err`) · Conciliado até (data do último lançamento conciliado ou "—"); conta arquivada = linha `apagada` + BadgeEstado `interna` "arquivada"; ações: BotaoIcone `editar` (`?editar=`), Botão fantasma P "Conciliar" (→ importar com a conta) e "Arquivar"/"Reativar". Cartão com o formulário "Nova conta"/"Editar conta": Nome, Tipo (seleção: Banco, Dinheiro, Pix / carteira, Outra), Saldo inicial e "Saldo em" (data), Botão primário "Salvar". `meta` abaixo da tabela: "N lançamentos pagos sem conta" quando houver (eles contam nos totais, mas em nenhuma conta). Em `/financas`, depois da Previsão, Seção "Contas" (só se houver contas ativas): uma linha por conta (nome em `corpo`, saldo à direita, `tabular-nums`) e o link "Gerenciar contas".
- **Campo Conta** (opcional) em todo formulário de lançamento (novo, ficha, gasto fixo) e no passo 2 da importação: Campo seleção com "—" + as contas ativas. Na lista do mês a conta vai em coluna `soComputador`. Lançamento conciliado: BadgeEstado `feita` "conciliado" no `subtitulo` do cabeçalho da ficha, depois da data.
- **Conciliação** (passo 2 da importação, quando uma Conta é escolhida — Campo seleção "Conta do extrato" que recarrega a prévia, `?conta=`): cada linha que bate com um lançamento existente (mesmo tipo e valor, até 3 dias de diferença, da mesma conta ou sem conta) ganha BadgeEstado `feita` "já registrado" com o link para o lançamento (e "pendente → pago" quando o existente estava a pagar/receber) e não é importada; as outras ficam como antes. Resumo `meta`: "X novas · Y já registradas". Botão primário "Importar X e conciliar Y". Abaixo da tabela, Seção "No sistema, mas não no extrato" (só se houver): lançamentos pagos da conta dentro das datas do extrato que nenhuma linha encontrou, com link, para conferir. E `meta`: "Saldo da conta no sistema em DD/MM (última data do extrato): R$ X; depois de importar: R$ Y" — compare com o saldo do banco.
- **Relatório mensal** (`/financas/relatorio?m=AAAA-MM`, gestão; Botão fantasma "Relatório do mês" com ícone `baixar` (falta o ícone documento) ao lado das setas do mês em `/financas`): página de leitura `max-w-3xl`, imprimível (`print:` sem navegação), com `CabecalhoPagina` (título "Relatório financeiro · <mês>", ações: ‹ › do mês, `Imprimir` (salvar como PDF) e Exportar Google Docs). Corpo em markdown (`Md`): Resumo (entradas, despesas, resultado, variação contra o mês anterior), Despesas e Entradas por categoria (com o mês anterior ao lado), Por projeto, Por evento, Contas (saldo no fim do mês), Gastos fixos do mês (pago / pendente), Pendentes no fim do mês, Previsão de caixa (só no mês atual) e a lista de lançamentos (data, descrição, categoria, conta, valor, "comprovante" sim/não); anulados ficam fora e são contados numa linha. O mesmo markdown vai ao Google Docs.
- **Simulador de preço** (`/financas/simulador`, gestão; Botão fantasma P "Simular preço" com ícone `gerar-outra` ao lado do título da Seção "Por evento" de `/financas`, e em cada linha da tabela um link para simular a partir daquele evento): formulário GET (cada simulação é um link; nada é gravado) em Cartão: "Com base em" (Campo seleção dos eventos com despesas, "—" = manual; trocar recarrega e preenche os campos), Participantes, Preço por pessoa, Custo fixo do evento, Custo por pessoa, Parte do custo fixo do Santuário (`ajuda` com o custo fixo mensal) e Margem desejada (%); Botão primário "Simular". Com base: `meta` dizendo de onde veio cada número ("N participantes pagantes; por pessoa = Alimentação + Hospedagem e limpeza; fixo = as outras despesas") e Tabela 10.8 recolhível "Custos do evento-base" (Categoria · Total · Conta como fixo / por pessoa). Resultado: 4 Cartões `kpi` — Resultado (verde/vermelho), Margem, Ponto de equilíbrio ("N participantes"), Preço mínimo — e o único Cartão `destaque` "Preço sugerido para X% de margem"; Aviso `atencao` quando o preço está abaixo do mínimo ou os participantes abaixo do ponto de equilíbrio. Abaixo, Tabela 10.8 "Cenários": Participantes (−50%, −25%, o simulado, +25%, +50%, e o ponto de equilíbrio) · Receita · Custo · Resultado (negativo em `text-err`), a linha simulada em negrito.
- **Evento financeiro** (`/financas/evento?e=<nome>`, gestão; o nome de cada evento na Seção "Por evento" de `/financas` abre esta página): CabecalhoPagina (rótulo Gestão · Finanças, título = nome do evento, subtítulo "N participantes pagantes · N lançamentos"; ações: Botão fantasma "Simular preço" → simulador com este evento de base). Sem orçamento: Aviso `info` "Este evento ainda não tem orçamento" com Botão "Criar no simulador". Com orçamento: Seção "Orçado × realizado" com Tabela 10.8 (Linha · Orçado · Realizado · A pagar/receber · Diferença): Participantes, Receita, Custo por pessoa, Custo fixo, Resultado do evento e, se houver, "Depois da parte do Santuário"; diferença = realizado + pendente − orçado, em `text-err` quando é pior (custo acima, receita/resultado abaixo), `text-ok` quando é melhor; `meta` abaixo com quem salvou e quando + Botão fantasma "Editar no simulador" (abre com os números do orçamento). Aviso `atencao` quando o resultado previsto fica abaixo do orçado. Seção "Despesas por categoria" (Tabela 10.8: Categoria · Conta como por pessoa/fixo · Pago · A pagar) e Seção "Participantes" (Tabela 10.8: Nome · Pago · A receber), as duas só quando houver dados.
- **Salvar orçamento** (no simulador, abaixo dos cenários): Cartão com Campo "Evento" (texto com sugestões dos eventos já usados; vem preenchido com o evento-base) e Botão primário "Salvar como orçamento" (ícone `confirmar`; curto para caber em 320 px); os números são os da simulação na tela. Evento que já tem orçamento: `meta` "Já tem orçamento (salvo em …): salvar substitui." Depois de salvar, volta à página do evento com Toast.
- **Reembolsos** (despesa paga com dinheiro próprio de alguém da equipe): no formulário de lançamento novo e na ficha, Campo seleção "Pago com dinheiro de" ("— Santuário" = padrão; depois as pessoas da equipe, sem contatos externos), só para despesa. Na ficha, Cartão "Reembolso": a reembolsar → `meta` "Pago por X com dinheiro próprio" + formulário com Campo seleção Conta (de onde saiu o reembolso, opcional) e Botão tonal "Reembolsado" (ícone `confirmar`); reembolsado → BadgeEstado `feita` "Reembolsado em <data>". Na lista do mês, BadgeEstado `pendente` "a reembolsar". Em `/financas`, Seção "Reembolsos a fazer" (contagem) logo depois de Pendentes: um grupo por pessoa (nome + total em `font-semibold`) com as linhas iguais às de Pendentes (data · descrição com link para a ficha · valor) e Botão tonal "Reembolsado" por linha. A despesa conta nos totais na data da compra (o custo existiu); no caixa e nas contas ela só sai quando é reembolsada.
- **Resultado (DRE)** (`/financas/resultado?m=AAAA-MM`; Botão fantasma M "Resultado" com ícone `tarefa` ao lado de "Relatório do mês" em `/financas`): CabecalhoPagina (rótulo Gestão · Finanças, título "Resultado · <mês>", ações ‹ › entre meses). 4 Cartões: `kpi` Receita, `kpi` Margem de contribuição (valor + % em `meta`), `kpi` Resultado operacional e o único `destaque` Resultado do período (negativos em `text-err`, nos kpi). Tabela 10.8 "Demonstrativo" (Linha · Este mês · Mês anterior (só no computador) · Acumulado do ano): linhas de total em `font-semibold` (Receita operacional, (−) Custos variáveis, = Margem de contribuição, (−) Despesas fixas, = Resultado operacional, (±) Não operacional, = Resultado do período) e, abaixo de cada grupo, as categorias em `meta text-t2` com recuo; "Investimentos (fora do resultado)" no fim. `meta` abaixo: ponto de equilíbrio do mês ("as despesas fixas pedem R$ X de receita com esta margem") e pendentes à parte (a receber / a pagar). Seção recolhível (`<details>`, como "Custos do evento-base") "Natureza das categorias": uma linha por categoria (nome + Campo seleção Receita operacional / Custo variável / Despesa fixa / Investimento / Não operacional) e Botão primário "Salvar naturezas"; mudar a natureza muda todos os meses (é a classificação, não o lançamento).
- **Separações** (plano financas fase 3):
  - **Titular da conta**: no formulário de conta, Campo seleção "Titular" ("Santuário (PJ)" padrão; depois "CPF de <pessoa>" para as pessoas da equipe) e Campo seleção "Unidade padrão" (opcional). Na Tabela de contas, BadgeEstado `aviso` "CPF de X" ao lado do nome. Lançamento numa conta de CPF: BadgeEstado `aviso` "conta pessoal" na lista do mês; em `/financas`, logo abaixo dos KPIs, `meta text-warn` "Passou por contas pessoais (CPF) este mês: R$ X em N lançamentos" (só quando houver); no Resultado, a mesma linha abaixo do demonstrativo.
  - **Unidade de negócio**: Campo seleção "Unidade" (Geral, Santuário · retiros e dietas, Inî Rau / loja, Casa de cura, Aluguel do espaço) no lançamento novo e na ficha; opção vazia "Da conta (senão Geral)" = a unidade padrão da conta, senão Geral. No Resultado, Chips de filtro (link) "Todas · <unidades com movimento no ano> · Geral" acima dos cartões (`?u=`) filtram o demonstrativo por unidade.
  - **Recurso com destino**: Campo texto "Recurso com destino" (sugestões dos já usados) no lançamento novo e na ficha: entrada = dinheiro recebido para aquele fim (doação/grant), despesa = uso dele. Em `/financas`, Seção "Recursos com destino" (só quando houver) com Tabela 10.8 Recurso · Recebido · Usado · Saldo (saldo negativo em `text-err`).
  - **Natureza do lançamento**: na ficha, Campo seleção "Natureza no resultado" ("Da categoria (<natureza>)" padrão, ou uma das cinco), para a obra que é investimento dentro de "Manutenção e obras".
- **Orçamento anual** (`/financas/orcamento?a=AAAA&u=`, plano financas fase 4; Botão fantasma M "Orçamento anual" com ícone `calendario` ao lado de "Resultado" em `/financas`): CabecalhoPagina (rótulo Gestão · Finanças, título "Orçamento <ano>", ações ‹ › entre anos). Chips de filtro por unidade como no Resultado ("Todas" = orçamento geral; cada unidade tem o seu). 3 Cartões `kpi` — Receitas (realizado até agora × orçado até agora), Despesas (idem), Previsão do resultado no fim do ano (realizado + orçado dos meses que faltam) — sem `destaque`. Aviso `atencao` quando alguma despesa passou de 90% do orçado do ano (lista as categorias). Seção "Por categoria": Tabela 10.8 (Categoria · Orçado no ano · Orçado até agora · Realizado · Usado do ano (%) · Previsão no fim do ano); BadgeEstado `aviso` "90%" quando passou de 90% e o % em `text-err` quando passou de 100% (despesas; nas receitas, `text-ok` acima de 100%). Seção "Mês a mês": Tabela (Mês · Receitas orçadas · realizadas · Despesas orçadas · realizadas), meses futuros só com o orçado. `<details>` "Editar orçamento": uma linha por categoria (nome + Campo "Valor no ano" + chips de marcar dos 12 meses em que o valor cai — todos marcados = igual todo mês, só os meses de retiro = sazonal) e Botão primário "Salvar orçamento"; acima, um formulário pequeno "Começar a partir de <ano−1>" com Campo "Reajuste (%)" e Botão tonal "Copiar" (usa o orçamento do ano anterior ou, se não houver, o realizado dele; não apaga categorias já preenchidas sem confirmar — `EnviarComConfirmacao`). Em `/financas`, quando houver categoria acima de 90% no ano corrente, `meta text-warn` com link "N categorias passaram de 90% do orçamento do ano".
- **Exportar para o contador** (em breve): no cabeçalho de `/financas`, depois de "Exportar", Botão fantasma M `desativado` (9.1: cadeado no lugar do ícone) "Contador · em breve". Sem ação até o conteúdo ser decidido (plano `docs/planos/financas-2026-11.md`, fase 5).
- **Acesso a Finanças por pessoa**: interruptor "Finanças" em `/controle → Funções` (mesmo padrão das outras funções). Quem tem a função vê o item Finanças no menu e todas as telas; ligar não manda aviso.

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
  --eq-escritorio:#2BB3A6; --eq-producao:#A68CF0; --eq-guardioes:#E37AB0; --eq-manutencao:#8FA6B8; --eq-pontes:#E08A5C;
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
  --eq-escritorio:#0F766E; --eq-producao:#6D4AB8; --eq-guardioes:#A3306B; --eq-manutencao:#4F6475; --eq-pontes:#A3542A;
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
