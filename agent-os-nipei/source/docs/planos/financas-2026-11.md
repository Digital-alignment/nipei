# Plano Finanças — novembro 2026

Depois da v2.89 (orçamento por evento e reembolsos). Ordem decidida com o Ashuan em 13/11/2026.
Cada fase entra em produção sozinha, com aprovação ("Sí, desplegar").

## Fase 1 — Permissão de Finanças por pessoa (v2.90)

Para quem cuida das contas (ex.: Rodrigo) lançar e conciliar sem entrar na Equipe 1.

- Interruptor **Finanças** em `/controle → Funções` (`FUNCOES.financas` em `lib/v2/funcoes.ts`): regra normal = Equipe 1; o admin liga para uma pessoa (ou desliga para alguém da gestão). Só o painel muda; **ninguém é avisado** (nem WhatsApp, nem aviso em Hoje).
- Quem tem a função vê e usa tudo de Finanças: lançamentos, ficha, comprovantes, contas e conciliação, gastos fixos, importar, relatório, simulador e evento; exportar Finanças/Relatório para o Google. Uma regra só, `podeFinancas(me)`, em todas as páginas, rotas e ações.
- Não muda: quem pode entrar na plataforma (acesso continua pela equipe/ficha; **Rodrigo não recebe a função nem acesso agora** — só quando Finanças estiver pronta), o Pinu e o MCP de finanças (continuam só gestão), o lembrete de segunda (continua só gestão), o CSV do diagnóstico (gestão ou responsável da seção).
- Ao abrir para alguém de verdade (depois): decidir se o lembrete de segunda e as ferramentas de finanças do MCP vão também para quem tem a função.

## Fase 2 — Resultado gerencial (DRE) mensal e anual (v2.91) ✓

> Feito em 14/11/2026. Observação: o DRE é por data de pagamento (caixa). Num retiro com inscrições num mês e custos no seguinte, um mês sai muito positivo e o outro negativo; o acumulado do ano e a página do evento mostram o quadro certo. Se incomodar: opção "por competência" (data do evento) — anotado para a fase 3/4.

- Cada categoria ganha uma **natureza**: receita operacional · custo variável (do evento/produto: alimentação, hospedagem, facilitadores…) · despesa fixa (estrutura: internet, manutenção…) · investimento (obras, equipamentos: fora do resultado operacional) · não operacional (doações/grants, impostos, taxas financeiras). Padrão sugerido para as categorias de hoje; ajustável numa tela.
- DRE: Receita → (−) custos variáveis = **margem de contribuição** (e %) → (−) despesas fixas = **resultado operacional** → (±) não operacional = **resultado do período** → investimentos à parte. Colunas: mês, mês anterior, acumulado do ano; "a pagar/receber" à parte.
- Onde: aba "Resultado" em `/financas` + seção no relatório mensal (o mesmo markdown vai ao Google Docs). Ponto de equilíbrio mensal = despesas fixas ÷ % de margem de contribuição.
- Pinu: `financas_resumo` devolve o DRE do período.

## Fase 3 — Separações (v2.92) ✓

> Feito em 14/11/2026: 1 (titular PJ/CPF da conta + aviso), 2 (unidade no lançamento, padrão da conta, DRE por unidade), 3 (recurso com destino + saldo) e 4 (natureza por lançamento). Ficaram para depois: 5 (campo único de centro de custo) e as regras "descrição contém X → categoria/unidade" aprendidas da importação; o Pinu já preenche unidade e recurso.

O que hoje se mistura e atrapalha decidir:

1. **Titular: Santuário (PJ) × pessoa (CPF)** — cada conta tem titular (PJ ou CPF de quem). Lançamento em conta de CPF = "movimento em conta pessoal" (exposição fiscal): selo na lista, total no mês e no DRE, e meta de zerar. Diferente de reembolso (dinheiro da pessoa) — os dois juntos dizem quanto do Santuário ainda passa por CPFs.
2. **Unidade de negócio**: Santuário (retiros/dietas) · Inî Rau / loja · Casa de cura · Aluguel do espaço — DRE por unidade (qual dá dinheiro, qual consome). Hoje só existe projeto, que mistura iniciativa com unidade.
3. **Recurso com destino (doação/grant restrito)** — entrada marcada com destino; despesas apontam para ela; saldo do recurso = recebido − gasto. Prestação de contas para quem doou.
4. **Investimento × custeio** (vem da fase 2) — obra do telhado não derruba a margem do retiro.
5. **Centro de custo = evento/projeto/unidade** num campo só no formulário (hoje são três campos soltos), para lançar mais rápido.

Eficiência: valores padrão por conta (titular e unidade vêm da conta escolhida), regras "descrição contém X → categoria/unidade" aprendidas da importação, e o Pinu preenche titular/unidade pelo que a pessoa disse.

## Fase 4 — Orçamento anual por categoria (v2.93) ✓

> Feito em 14/11/2026: orçamento por ano e unidade, valor anual por categoria com os meses em que cai (sazonal), orçado × realizado por categoria e mês, previsão de fim de ano, alerta de 90% (página, `/financas`, relatório, Pinu) e "Começar a partir do ano anterior" com reajuste (usa o orçamento anterior ou o realizado). Ficaram para depois: revisão no meio do ano guardando a versão original, somar os orçamentos de evento no mês do evento, cenários e alerta de 90% por WhatsApp.

- Orçamento do ano por categoria (e por unidade de negócio, da fase 3), dividido por mês (igual ou com sazonalidade: meses de retiro).
- Orçado × realizado mês a mês e acumulado; previsão de fim de ano (realizado + orçado dos meses que faltam); alerta quando uma categoria passa de 90% do orçado do ano.
- Depois (para aumentar a funcionalidade): copiar o ano anterior com reajuste (%), revisão no meio do ano guardando a versão original, orçamentos de evento (v2.89) somados no mês do evento, e cenários (otimista/realista) ligados à previsão de caixa.

## Fase 5 — Exportação para o contador (só o lugar, por enquanto)

- Item "Exportar para o contador" em `/financas` marcado como **em breve** (sem ação). O conteúdo (ZIP ou pasta no Drive com lançamentos, comprovantes, extratos conciliados, DRE) será decidido quando as fases 1–4 estiverem prontas.
