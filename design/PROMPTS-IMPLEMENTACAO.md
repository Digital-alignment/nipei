# Prompts para implementar o Design System no código (Claude Code)

Use **um prompt por sessão**, na ordem. Cada prompt é autônomo: copie o bloco inteiro.
Só passe para o próximo depois de revisar o resultado (de preferência na página `/design` e nas telas afetadas, em escuro, claro, celular e computador).

Repositório: `nipei-control/agent-os-nipei/source` (Next 16 · React 19 · Tailwind v4).
Documentos de design: `nipei-control/design/` (`DESIGN-SYSTEM.md`, `DECISOES.md`, `INVENTARIO.md`, `ICONES.md`, `icones/`, `preview-*.html`).

---

## Prompt 0 — Preparação e diagnóstico

```
Vamos implementar o novo design system do Nipëi OS. Antes de mudar qualquer tela, preciso de preparação e diagnóstico.

Contexto:
- Fonte da verdade: ../../design/DESIGN-SYSTEM.md (leia inteiro). Histórico: ../../design/DECISOES.md. Estado atual: ../../design/INVENTARIO.md.
- Ícones SVG prontos: ../../design/icones/ (funcionais/, simbolos/, simbolos-2/, simbolos-3/).
- A interface v2 está em src/app/(v2) e src/components/v2. A v1 pode ainda existir em outras rotas.

Tarefas:
1. Crie a branch `design-system-v1` a partir da branch atual.
2. Copie DESIGN-SYSTEM.md, DECISOES.md e ICONES.md para docs/design-system/ e as pastas de ícones para design-assets/icones/ (mantendo a estrutura). Não copie os preview-*.html nem referencias/.
3. Diagnóstico (não altere nada ainda, só relate):
   a. Quais rotas/componentes ainda usam a v1? Quem usa as fontes Alata, Space Mono, Geist, Bricolage Grotesque, Manrope, JetBrains Mono, Caveat e as variáveis do bloco "Official Design System" do src/app/globals.css (--bg-deep, --empresa-primary, etc.)?
   b. Como a classe `.v2` e o tema claro/escuro funcionam hoje (classe `dark:`? prefers-color-scheme?).
   c. Contagem atual: arquivos que importam lucide-react, usos de `dark:`, de cores Tailwind literais (neutral-, green-, amber-, red-, sky-, violet-, pink-, blue-), de text-[10px]/text-[11px], de `confirm(`.
4. Acrescente ao CLAUDE.md e ao AGENTS.md uma seção "Design system (obrigatório)":
   - Toda UI nova da v2 usa os tokens e componentes descritos em docs/design-system/DESIGN-SYSTEM.md.
   - Proibido: cores literais (hex ou classes de cor do Tailwind), `dark:`, lucide-react, emojis na interface, fontes monospace, text-[10px]/text-[11px], confirm()/alert().
   - Ícones só via <Icone> / <Selo>. Componentes visuais só de src/components/ds/.
   - Antes de criar um componente visual novo, ele precisa existir no DESIGN-SYSTEM.md.

Ao terminar: me mostre o relatório do item 3 e uma proposta do que pode ser removido com segurança. Faça commit ("chore(ds): preparação do design system v1"). Não mexa em telas.
```

---

## Prompt 1 — Tokens, Tailwind e tema

```
Implemente a fundação do design system (sem mudar a aparência das telas ainda).

Leia: docs/design-system/DESIGN-SYSTEM.md, seções 2, 3, 5, 8, 11 e 13.1.

Tarefas:
1. Em src/app/globals.css, crie os tokens da seção 13.1 (escuro como padrão; claro em [data-tema="claro"]; "Sistema" = sem atributo, segue prefers-color-scheme). Escopo: aplicar dentro de `.v2` para não afetar a v1 (se o diagnóstico do Prompt 0 mostrou que a v1 não existe mais, aplique no :root e remova o bloco antigo "Official Design System").
2. Tailwind v4: mapeie os tokens com `@theme inline` para eu poder escrever classes como bg-bg, bg-s1, bg-s2, bg-s3, text-t1, text-t2, text-t3, bg-ac, text-ac-ink, text-ac-text, bg-ac-soft, text-ok, bg-ok-bg (e warn, err, info), text-eq-guardioes etc., rounded-pilula, rounded-moldura, rounded-bloco, rounded-cartao, rounded-interno, font-display, font-texto, shadow-brilho-ia, shadow-foco.
3. Tema: crie src/components/ds/Tema.tsx com o seletor Escuro / Claro / Sistema (seletor segmentado com ícones tema-escuro, tema-claro, tema-sistema — por enquanto texto, os ícones chegam no Prompt 3). Padrão = Escuro. Salvar a escolha da pessoa (o projeto já tem um padrão de preferência? use-o; senão, localStorage) e aplicar `data-tema` no <html> com um script inline antes da hidratação para não piscar.
4. Utilitários CSS: `.hachurado` (linhas diagonais 135°, tons s2/s4), `.brilho-ia`, `.anel-foco`, e respeito a prefers-reduced-motion (desliga animações com a classe utilitária ou media query global).
5. Verifique os contrastes dos pares texto/fundo da seção 3.5 com um pequeno script (Node) e mostre o resultado.

Critérios de aceite: build passa; nenhuma tela mudou de aparência ainda; trocar data-tema no DevTools troca todos os tokens. Commit: "feat(ds): tokens, tema e utilitários".
```

---

## Prompt 2 — Fontes

```
Troque a tipografia para o design system.

Leia: docs/design-system/DESIGN-SYSTEM.md, seção 4.

Tarefas:
1. Carregue Outfit (100–900) e Google Sans (opsz 17–18, 400–700, itálico) — de preferência com next/font/google; se Google Sans não estiver disponível no next/font desta versão, use <link> do Google Fonts com display=swap e preconnect. Exponha como --fonte-display e --fonte-texto.
2. Crie em globals.css (ou num arquivo ds/tipografia.css) as classes dos estilos da seção 4: .titulo-pagina, .saudacao, .numero-display, .titulo-secao, .titulo-cartao, .corpo, .botao-texto, .rotulo-campo, .meta, .rotulo-maiusculo — com os tamanhos de celular e de computador (breakpoint 1024px), tabular-nums onde indicado e text-wrap: balance nos títulos.
3. Remova os carregamentos de fontes que o diagnóstico do Prompt 0 mostrou que não são usados (Bricolage, Manrope, JetBrains Mono, Caveat, Space Mono, Alata, Geist). Se a v1 ainda usar alguma, mantenha só essa, isolada na v1.
4. Garanta: nenhuma fonte monospace na v2.

Critérios: build passa; a v2 renderiza em Google Sans; nenhum request de fonte não usada. Commit: "feat(ds): tipografia Outfit + Google Sans".
```

---

## Prompt 3 — Ícones e selos

```
Crie os componentes de ícone a partir dos SVGs do design system.

Leia: docs/design-system/DESIGN-SYSTEM.md seção 7 e docs/design-system/ICONES.md. SVGs em design-assets/icones/.

Tarefas:
1. Script scripts/gerar-icones.mjs que lê design-assets/icones/funcionais/*.svg e simbolos*/ *.svg, remove metadados (<metadata>, xmlns:c2pa etc.), mantém só viewBox + <path d>, e gera src/components/ds/icones.generated.ts com um mapa nome → { viewBox, d }. Adicione "icones" ao package.json scripts.
2. src/components/ds/Icone.tsx: <Icone nome="lixeira" tamanho={20} className=... aria-label?/> → <svg fill="currentColor">. `nome` tipado (union dos nomes gerados). aria-hidden por padrão; se receber aria-label, vira role="img".
3. src/components/ds/Selo.tsx: <Selo nome="sol" /> com nomes semânticos mapeados para os arquivos (sol=simbolo-27, lua=simbolo-14, broto=simbolo-03, espiral=simbolo-18, quadrados=simbolo-54, mao=simbolo-17, olho=simbolo-57, semente=simbolo-46, irradiacao=simbolo-47, escritorio=simbolo-13, producao=simbolo-11, guardioes=simbolo-10, manutencao=simbolo-62). Exporte também o acesso por arquivo (`simbolo-NN`, `simbolo2-NN`, `simbolo3-NN`) para ilustrações.
4. Bloqueie no gerador os símbolos proibidos do lote 2 (08, 11, 15, 18, 20, 21, 22, 38, 41, 42): não entram no mapa.
5. Atualize o seletor de tema do Prompt 1 para usar os ícones tema-escuro / tema-claro / tema-sistema.

Não substitua o lucide nas telas ainda. Commit: "feat(ds): Icone e Selo gerados dos SVGs".
```

---

## Prompt 4 — Página /design (guia vivo)

```
Crie a página interna /design, que será a referência visual dos componentes.

Tarefas:
1. Rota src/app/(v2)/design/page.tsx, visível só para perfis de gestão (use a mesma checagem de permissão do Painel/controle).
2. Estrutura com seções e âncoras: Cores (escala neutra, acento, estados, equipes — mostrando os tokens dos dois temas lado a lado), Tipografia (todos os estilos), Raios e espaço, Ícones (grade de todos os <Icone> e <Selo> com nome), e seções vazias para os componentes que virão (Botão, Campo, Chip, Badge, Avatar, Cartão, Aviso, Abas, Progresso, Vazio, Skeleton, Menu, Pinu, Padrões).
3. Um seletor no topo para alternar Escuro / Claro na própria página.
4. Use só tokens e as classes de tipografia.

Critério: a página funciona no celular e no computador. Compare visualmente com ../../design/preview-cores.html. Commit: "feat(ds): página /design".
```

---

## Prompt 5 — Botões

```
Implemente os botões do design system.

Leia: DESIGN-SYSTEM.md seções 6 e 9.1–9.4. Referência visual: ../../design/preview-botoes.html (o documento prevalece sobre a prévia).

Componentes em src/components/ds/:
1. <Botao variante="primario|tonal|fantasma|destrutivo" tamanho="G|M|P" icone="mais" iconeDireita? carregando? desativado? folha? />
   - Sempre com ícone (TypeScript exige `icone`).
   - `folha` = raio 8/28 alternado (só a ação principal da tela).
   - `carregando` = arco girando + texto, desativado.
   - `destrutivo` só deve ser usado dentro do diálogo (documente no JSDoc).
2. <BotaoIcone icone aria-label tamanho="52|44|40" variante="tonal|fantasma" /> com tooltip.
3. <BotaoDividido rotulo="Continuar" /> (corte diagonal, duas peças).
4. <Bloco icone rotulo indicador? numero? /> + <MolduraBlocos> (raio 28, vão 8).
5. <Etapas passos={[...]} atual={n} /> (feita sólida, atual em pétala, próxima hachurada, última em ponta de seta).
6. <Segmentado opcoes valor onChange /> (ícones).
Estados: hover, pressionado, foco visível (anel de acento), desativado; área de toque ≥ 44 px.

Adicione todos na /design. Commit: "feat(ds): botões, blocos, etapas, segmentado".
```

---

## Prompt 6 — Campo

```
Implemente o Campo.

Leia: DESIGN-SYSTEM.md seção 9.5 e regra 4 (brilho de interação). Referência: ../../design/preview-componentes.html.

<Campo> com tipos: texto, titulo (Outfit 300 grande), area (várias linhas), busca, selecao, data. Props: rotulo (dentro do campo), ajuda, erro, iconeEsquerda, acaoDireita.
- Sem borda; superfície s2; raio pílula (uma linha) ou cartão (várias linhas).
- Hover = shadow-brilho-ia fraco; foco = shadow-foco; erro = anel err + Icone erro + mensagem.
- Variante busca do Pinu: mini-anel à esquerda + BotaoIcone microfone em acento.
- Slot de sugestão do Pinu: <SugestaoPinu texto onUsar onOutra /> (mini-anel + texto + confirmar + gerar-outra), por enquanto com dados passados por props.
- Acessível: label ligada ao input, aria-invalid, aria-describedby para ajuda/erro.

Na /design. Commit: "feat(ds): campo".
```

---

## Prompt 7 — Chip, Badge, Avatar

```
Implemente Chip, Badge e Avatar.

Leia: DESIGN-SYSTEM.md seções 9.6–9.8 e 3.4. Referência: ../../design/preview-chips-cartoes.html.

1. <Chip tipo="filtro|equipe|metadado|pinu" icone ativo? contagem? equipe? onClick?>
   - filtro ativo = s3 + contorno interno + Icone confirmar em acento.
   - equipe = <Selo> da equipe na cor da equipe + nome; ativo = anel na cor da equipe.
2. <Contagem valor?> (círculo vermelho ou ponto) para pôr no canto de ícones.
3. <BadgeEstado estado="pendente|andamento|feita|atrasada|interna" /> (pendente = .hachurado).
4. <Avatar nome foto? equipe tamanho="24|32|40|56|80" online? selo? /> (iniciais Outfit 600 sobre a cor da equipe) e <GrupoAvatares max={3}> com "+N".
5. <LinhaPessoa> (avatar + nome + "equipe · função").
Substitua internamente o Chip e o Avatar atuais de components/v2/ui.tsx para reexportarem os novos (sem quebrar quem usa).

Na /design. Commit: "feat(ds): chip, badge, avatar".
```

---

## Prompt 8 — Cartão

```
Implemente o Cartão e suas variantes.

Leia: DESIGN-SYSTEM.md seções 9.9 e 6 (recorte). Referências: ../../design/preview-chips-cartoes.html e ../../design/preview-tarefas.html.

<Cartao variante="padrao|clicavel|destaque|kpi|evento|pinu" recorte? acaoRecorte?> com <CabecalhoCartao icone titulo acao="mais-opcoes|abrir-fora">.
- Sem borda e sem sombra; raio-cartao; s1.
- destaque = bg destaque-bg / destaque-ink (acento no escuro, bloco escuro no claro).
- kpi = número em .numero-display com parte secundária em t3 (prop `unidade`), variação.
- evento = barra lateral na cor da equipe.
- recorte = máscara no canto superior direito com BotaoIcone dentro (o botão fica fora do elemento mascarado).
- pinu = gradiente ac-soft + shadow-brilho-ia.
- <GradeBento> (3 colunas ≥ 1024px, 1 no celular).
Substitua o `Card` de components/v2/ui.tsx para reexportar o novo.

Na /design. Commit: "feat(ds): cartão".
```

---

## Prompt 9 — Aviso, Toast e Diálogo

```
Implemente Aviso, Toast e Diálogo de confirmação, e elimine o confirm() do navegador.

Leia: DESIGN-SYSTEM.md seção 9.10. Referência: ../../design/preview-componentes.html.

1. <Aviso estado="sucesso|atencao|erro|info" titulo mensagem acoes? progresso? onFechar?> com lavagem da cor do estado no canto (radial-gradient, não brilho) e ícone em círculo.
2. Toast: provider + hook useToast() → toast.sucesso("Salvo"); pílula compacta, some sozinho, aria-live="polite".
3. <Dialogo> acessível (foco preso, Esc fecha, fundo escurecido) e hook useConfirmar() → await confirmar({ titulo, mensagem, confirmarRotulo:"Remover", perigoso:true }).
4. Substitua: ConfirmarBotao e todos os confirm(); a faixa verde "ok" repetida em 4 páginas → toast; ErroAviso e faixas âmbar → <Aviso>.
Liste no final os arquivos alterados.

Commit: "feat(ds): aviso, toast, diálogo; remove confirm()".
```

---

## Prompt 10 — Abas, recolhível, interruptor, slider, configurações

```
Implemente os controles restantes.

Leia: DESIGN-SYSTEM.md seções 9.11–9.15. Referência: ../../design/preview-componentes.html.

1. <Abas itens={[{id, rotulo, icone, contagem}]} ativa onChange pasta? /> — ativa = s3 + ícone em acento + ponto embaixo; `pasta` funde a aba ativa ao painel (cantos invertidos). Teclado: setas, role="tablist". Substitui components/v2 Abas (mantendo "lembrar a última").
2. <SecaoRecolhivel titulo contagem> com Icone abrir girando 180°; substitui Recolhivel (mantendo a memória do estado).
3. <Interruptor> (role="switch").
4. <ControleDeslizante rotulo valor min max passo formatar? /> e variante de opções.
5. <ListaConfiguracoes> + <LinhaConfiguracao rotulo valor? interruptor? onClick?>.
Na /design. Commit: "feat(ds): abas, recolhível, interruptor, slider, configurações".
```

---

## Prompt 11 — Progresso, carregando, vazio, skeleton, menu ⋯

```
Implemente os componentes de estado e o menu de ações.

Leia: DESIGN-SYSTEM.md seções 9.16–9.19. Referência: ../../design/preview-progresso-vazio.html e ../../design/preview-tabela-nav.html (menu).

1. <BarraProgresso valor max planejado? segmentos? marcador? variante="acento|info" /> (resto hachurado quando planejado).
2. <AnelProgresso valor tamanho="140|72|48|24" rotulo? /> e <SemanaAneis dias />.
3. <Carregando tamanho /> (arco; com reduced-motion vira texto "Carregando…").
4. <EstadoVazio selo titulo texto acao destaque? /> (destaque = padrão de selos a 5% + selo verde).
5. <Skeleton forma="linha|circulo|pilula|bloco" largura /> e composições prontas: SkeletonCartao, SkeletonLista. Substitua loading.tsx da v2.
6. <MenuAcoes itens={[{icone, rotulo, onSelect, sensivel?}]} /> (popover s2 + contorno 1px, divisor antes de itens sensíveis, teclado, botão ⋯ com anel de acento enquanto aberto). "Remover…" chama useConfirmar.
Substitua Progress e Empty de components/v2/ui.tsx.

Commit: "feat(ds): progresso, vazio, skeleton, menu".
```

---

## Prompt 12 — Orbe e mini-anel do Pinu

```
Implemente a identidade visual do Pinu.

Leia: DESIGN-SYSTEM.md seções 8 e 10.11. Referência de movimento: ../../design/preview-pinu.html.

1. <OrbePinu estado="repouso|ouvindo|pensando|falando" tamanho nivelAudio? /> — gradiente #042608 → #2A5C0B → #808F12 → #C3D14A, forma orgânica (border-radius animado), brilho leve; durações da seção 8; `nivelAudio` (0–1) aumenta a escala no estado ouvindo. Reduced motion = orbe parado.
2. <MiniAnelPinu tamanho /> (anel em conic-gradient com brilho) — avatar do Pinu.
3. <ChipPinu> "Sugerido pelo Pinu".
Na /design, com um seletor dos 4 estados. Commit: "feat(ds): orbe e mini-anel do Pinu".
```

---

## Prompt 13 — Estrutura: navegação e cabeçalho

```
Migre a estrutura da v2 (menu, barra do celular, cabeçalho) para o design system.

Leia: DESIGN-SYSTEM.md seções 10.1 e 10.10. Referências: ../../design/preview-tabela-nav.html (computador) e ../../design/preview-botoes.html (barra do celular — atenção: o orbe vai NO CENTRO, não no fim).

1. Nav (components/v2/Nav):
   - Computador: menu lateral flutuante, recolhido por padrão (lembrar escolha); selos do lote 1 (sol, lua, broto, espiral, quadrados, mão, olho, semente); item ativo = s2 + contorno 1px + barra de acento à esquerda, sem brilho; grupos com .rotulo-maiusculo; contagens; ponto vermelho de novidade; configurações; OrbePinu no pé (abre o Pinu).
   - Celular: barra inferior flutuante em pílula com OrbePinu no centro ligado por ponte líquida (SVG fixo ou filtro); item ativo = círculo em acento.
2. Cabeçalho do layout: campo "Pergunte ao Pinu ou busque…" (Campo busca do Pinu), notificações (BotaoIcone notificacao + Contagem), Avatar. Remova os ícones lucide do cabeçalho.
3. <CabecalhoPagina rotulo selo titulo subtitulo acoes abas filtros /> (título .titulo-pagina) e substitua `Title` de components/v2/ui.tsx.
Verifique em escuro/claro, 390px e 1440px. Commit: "feat(ds): navegação, cabeçalho e cabeçalho de página".
```

---

## Prompt 14 — Hoje

```
Migre a página Hoje para o design system.

Leia: DESIGN-SYSTEM.md seções 9 e 10 (faixa da semana 10.5, linha de tarefa 10.3, Pinu 10.11) e as regras globais 5 e 6.

- Cabeçalho com saudação (.saudacao, dois tons) — a saudação usa display fino; títulos de seção em .titulo-secao.
- Faixa da semana em pílulas (ou anéis de progresso, se houver dado de conclusão).
- Lista de tarefas com o novo <LinhaTarefa> (crie em components/ds/padroes/LinhaTarefa.tsx: barra da equipe, círculo concluir com StatusBotao existente por baixo para manter o funcionamento offline, título + selo + prazo, metadados, avatares, BadgeEstado, MenuAcoes; feita = riscada; agrupada por Atrasadas / Hoje / Amanhã com contagem; no celular esconde metadados e estado). Substitua TaskRow/TaskList.
- CampoAssistente → Campo busca do Pinu.
- Botão "+" flutuante (BotaoIcone 56, branco) abrindo as ações de criação.
- Um único destaque de conteúdo na tela.
Remova todos os lucide e cores literais desta página. Commit: "feat(hoje): design system".
```

---

## Prompt 15 — Tarefas e Quadro

```
Migre Tarefas (lista, ficha e nova tarefa) e crie a vista Quadro.

Leia: DESIGN-SYSTEM.md 10.1–10.4, 10.7, 9.3 (etapas), 9.5 (campo + sugestão do Pinu), 9.11 (abas pasta). Referências: ../../design/preview-tarefas.html e ../../design/preview-agenda-quadro.html.

1. Página de tarefas: CabecalhoPagina (título "Tarefas", contagens, busca, "Nova tarefa" em folha), abas Lista / Quadro / Agenda, chips de filtro; Lista com LinhaTarefa; variante em grade com Cartao recorte.
2. Quadro: colunas por estado (BadgeEstado + contagem + "+"), cartões compactos, "Adicionar tarefa" hachurado, arrastar entre colunas muda o estado (reaproveite a lógica de ArrastarAgenda/StatusBotao; acessível por teclado com MenuAcoes "Mover para…"); no celular, colunas deslizáveis.
3. Ficha da tarefa: abas pasta (Detalhes / Comentários / Atividade); IAPanel com o novo cartão de proposta (Prompt 17 completa o Pinu).
4. NovaTarefaForm: Campos novos, prioridade em Chips, pessoas com Avatar, PrazoRapido com o novo visual; opcional: Etapas se o formulário for em passos.
Commit: "feat(tarefas): design system + vista Quadro".
```

---

## Prompt 16 — Agenda

```
Migre a Agenda.

Leia: DESIGN-SYSTEM.md 10.5 e 10.6. Referência: ../../design/preview-agenda-quadro.html.

- CabecalhoPagina "Agenda" + "Novo evento" (folha) + abas Dia / Semana / Mês + chips das 4 equipes.
- Dia: faixa da semana em pílulas; grade de horas com linha do agora (âmbar); evento com horário = bloco tingido (cor da equipe misturada com s1) + barra; tarefa/lembrete = pílula com ícone e ponto; "+" flutuante. Mantenha ArrastarAgenda funcionando.
- Lista por dia com número .numero-display.
- Mês: grade com pontos por equipe, hoje em acento, lista do dia embaixo (celular) / ao lado (≥1024px).
- Peça os ícones `semana` e `mes` se ainda não existirem (use calendario por ora e deixe TODO).
Commit: "feat(agenda): design system".
```

---

## Prompt 17 — Pinu (assistente)

```
Redesenhe o AssistenteGlobal com a identidade do Pinu.

Leia: DESIGN-SYSTEM.md 10.11 e 9.5 (sugestão nos campos). Referência: ../../design/preview-pinu-chat.html (o Pinu fala em BALÃO verde à esquerda; a pessoa em balão tonal à direita).

1. Painel do Pinu: tela cheia no celular, painel lateral no computador; fundo com gradiente verde/oliva vindo do topo; selo "Pinu" com MiniAnel.
2. Início: saudação em dois tons, bento com "Falar com o Pinu" em folha preenchida (destaque) + 2 sugestões, Recentes, campo grande (+, imagem, microfone).
3. Conversa: balões; ações da resposta (gerar-outra, editar, mais-opcoes); chips de continuação acima do campo; estado pensando = OrbePinu mini + "Pinu está pensando…" + skeleton.
4. Cartão de proposta (substitui Confirmar/Cancelar atuais): título com ícone + BadgeEstado "Proposta", lista do que será feito (responsável, prazo), Confirmar (primário) / Ajustar (tonal) / Cancelar (fantasma). Mantenha a lógica atual de propostas.
5. Voz: mantenha o funcionamento atual; use OrbePinu com o estado correspondente.
6. Ligue <SugestaoPinu> no campo título da NovaTarefaForm se já houver endpoint de sugestão; se não, deixe o slot pronto e um TODO.
Commit: "feat(pinu): nova interface do assistente".
```

---

## Prompt 18 — Demais telas

```
Migre as telas restantes da v2, uma por vez, na ordem: Acervo, Conhecimento, Pessoas (lista e ficha), Equipes, Projetos, Objetivos, Finanças, Painel/controle (todos os módulos), Diagnósticos, Login.

Para cada tela:
- CabecalhoPagina, busca + filtros (10.2), componentes de components/ds.
- Painel: tabelas → <Tabela> (crie em components/ds/padroes/Tabela.tsx conforme 10.8: cabeçalho .rotulo-maiusculo, ordenação, linhas 56px, números tabulares, minigráfico <Sparkline>, BadgeEstado, MenuAcoes; no celular vira lista de cartões).
- Atividade (ficha da pessoa, tarefa, Painel) → <LinhaDoTempo> (10.9) com Aprovar / Recusar onde houver pedidos.
- Painel → Funções e Conexões: ListaConfiguracoes + Interruptor.
- Estados vazios → EstadoVazio; carregamentos → Skeleton.
- Login: estado vazio de destaque com padrão de selos.
- Zero lucide, zero cores literais, zero `dark:`, zero text-[10px]/[11px].
Faça um commit por tela ("feat(<tela>): design system") e me mostre a lista do que mudou ao fim de cada uma.
```

---

## Prompt 19 — Proteções automáticas

```
Crie proteções para o design system não se degradar.

1. scripts/verificar-ds.mjs que falha (exit 1) se, em src/app/(v2) e src/components/(v2|ds), encontrar:
   - import de "lucide-react";
   - classes `dark:`;
   - classes de cor do Tailwind (bg-|text-|border-|ring-|from-|to-)(neutral|gray|zinc|slate|stone|green|emerald|amber|yellow|red|rose|sky|blue|violet|purple|pink|orange)-\d+;
   - hex literais (#RGB/#RRGGBB) fora de globals.css e icones.generated.ts;
   - text-[10px] e text-[11px];
   - confirm( ou alert(;
   - emojis (faixas Unicode de emoji);
   - font-mono ou famílias monospace.
   Mostre arquivo:linha de cada problema.
2. Adicione "verificar:ds" ao package.json e ao fluxo de build/CI existente (ou ao pre-commit, se houver).
3. Script de contraste: lê os tokens de globals.css e confere os pares da seção 3.5 nos dois temas (≥ 4,5:1).
Commit: "chore(ds): verificação automática".
```

---

## Prompt 20 — Limpeza final e revisão

```
Faça a limpeza final da migração do design system.

1. Rode verificar:ds e corrija tudo o que restar.
2. Remova: dependência lucide-react (se nada mais usar), constantes CARTAO/BOTAO/field/campo locais, componentes v2 antigos agora reexportados (atualize os imports para components/ds), fontes e variáveis CSS antigas não usadas, faixas "ok" manuais.
3. Revisão manual com checklist, em escuro e claro, a 390px e 1440px, das telas Hoje, Tarefas, Agenda, Pinu, Painel:
   - um só destaque de conteúdo por tela;
   - brilho só no Pinu e em campos;
   - nenhum botão com contorno;
   - "Remover" vermelho só no diálogo;
   - todo botão com ícone;
   - texto ≥ 12px no celular;
   - toque ≥ 44px;
   - foco visível com teclado;
   - reduced motion respeitado.
4. Atualize docs/design-system/DESIGN-SYSTEM.md se algo mudou na implementação, e o CHANGELOG.
5. Me entregue um resumo final: o que foi feito, o que ficou pendente (seção 14 do documento), e números antes/depois (arquivos com lucide, usos de dark:, cores literais, componentes duplicados).
Commit: "chore(ds): limpeza final da migração". Depois disso, abra o PR da branch design-system-v1.
```

---

### Dicas de uso
- Antes de cada prompt, peça ao agente para **ler `docs/design-system/DESIGN-SYSTEM.md`** (já está em todos os prompts).
- Se o agente quiser inventar um componente, a resposta é: "primeiro adicione ao DESIGN-SYSTEM.md e me mostre".
- Revise sempre na página `/design` antes de aprovar uma fase.
- Prompts 5 a 12 podem ser feitos em qualquer ordem entre si; 13 em diante dependem deles.
