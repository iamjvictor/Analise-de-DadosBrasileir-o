# Previsões Contextuais por Partida — Plano de Implementação

> **Para agentes de implementação:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans para implementar este plano tarefa a tarefa. Use caixas de seleção (`- [ ]`) para acompanhar o trabalho.

**Objetivo:** Evoluir o preditor para combinar força da temporada, métricas de ataque/defesa recentes, forma dos últimos cinco jogos, desempenho no mando, H2H venue-specific e ajuste de clássicos validado historicamente.

**Arquitetura:** Adicionar funções puras de features por mando e H2H, compor esses dados em `predictFixture()` antes da distribuição Poisson, e avaliar a alteração por walk-forward sem vazamento temporal. O serviço carrega histórico de temporadas anteriores para a previsão, mantendo standings, forma de dashboard e simulação da temporada selecionada.

**Tech Stack:** Node.js, TypeScript, Vitest, JSON local e módulos atuais de Poisson, Elo, dashboard e avaliação.

**Spec:** `docs/superpowers/specs/2026-10-04-contextual-match-prediction-design.md`

## Restrições globais

- Incluir em todos os sinais somente partidas `FINISHED` com placar completo e kickoff anterior ao da fixture.
- Manter limites `lambda` em `[0.15, 4]` e obter todas as probabilidades da distribuição de placares Poisson.
- Não incluir `POSTPONED`, `IN_PLAY`, `SUSPENDED`, `CANCELLED` ou fixtures futuras na amostra observada.
- Preservar o contrato público de `MatchPrediction` e do dashboard.
- Não ativar um ajuste de clássico sem resultado reproduzível em walk-forward; se não houver evidência, paridade permanece neutra.
- Usar timestamps ISO UTC para ordenar datas; partida sem kickoff não é elegível para recorte temporal de fixture datada.
- Não adicionar dependências externas nem fazer chamadas de API nos testes.

## Foco de revisão

1. Jogos com mesma data/hora e sem data: assegurar corte cronológico estrito e desempate determinístico sem deixar o resultado previsto vazar para features.
2. Clubes com menos de cinco/dez jogos em temporada parcial: amostras curtas devem ser suavizadas/neutras, não tratadas como taxas confiáveis.
3. H2H entre temporadas e clubes promovidos/rebaixados: incluir apenas IDs que coincidam, o par correto e o mando especificado.
4. Nenhum H2H no mando atual: não inverter mandos nem produzir ajuste artificial.
5. Dados locais 2026 parcialmente concluídos: histórico de temporadas antigas pode alimentar o H2H, mas classificação e simulação continuam limitadas a 2026.

---

### Tarefa 1: Estatísticas recentes com corte temporal e mando

**Arquivos:**
- Modificar: `backend/src/modules/analysis/form.ts`
- Teste: `backend/test/analysis/form-elo.test.ts`

**Interfaces:**
- Preservar `getRecentForm(team, matches, limit?)`.
- Adicionar `getRecentPerformance(team, matches, options): RecentPerformance`, com opções `before: string | null`, `limit: number`, `venue: 'any' | 'home' | 'away'`.
- `RecentPerformance` contém `matches`, `wins`, `draws`, `losses`, `points`, `pointsPerGame`, `goalsFor`, `goalsAgainst`, `goalsForPerMatch`, `goalsAgainstPerMatch`, `goalDifferencePerMatch`.

- [x] Adicionar testes para janela cinco/dez, recorte `utcDate < before`, placar nulo/status não finalizado, ordenação de empate por ID, e filtragem de jogos `home`/`away`.
- [x] Rodar `npm --prefix backend test -- test/analysis/form-elo.test.ts` e confirmar que os novos casos falham antes da implementação.
- [x] Implementar a função pura em `form.ts`; datas nulas não passam um corte datado. Com nenhuma partida, contagens e totais são zero e médias por jogo são zero.
- [x] Rodar o teste focado e `npm run typecheck --prefix backend`; ambos devem passar.

### Tarefa 2: Feature de confronto direto no mando da fixture

**Arquivos:**
- Criar: `backend/src/modules/analysis/headToHead.ts`
- Teste: `backend/test/analysis/head-to-head.test.ts`

**Interfaces:**
- Criar `getVenueHeadToHead(homeTeamId, awayTeamId, matches, before): HeadToHeadSummary`.
- Summary inclui `matches`, `homeGoalsPerMatch`, `awayGoalsPerMatch`, `homePointsPerMatch`, `awayPointsPerMatch`, com no máximo cinco encontros elegíveis e recentes.

- [x] Testar que apenas jogos anteriores entre o mesmo par, com os mesmos clubes nos papéis casa/fora, entram; testar máximo cinco, ordem determinística, exclusão de status e placar inválido, corte por kickoff e retorno neutro com amostra vazia.
- [x] Rodar `npm --prefix backend test -- test/analysis/head-to-head.test.ts` e confirmar falha inicial.
- [x] Implementar seleção/ordenação e resumo, sem inverter mando nem acessar arquivos ou relógio do sistema.
- [x] Ponderar H2H do mais recente ao mais antigo com pesos relativos `1.0, 0.8, 0.6, 0.4, 0.2`; multiplicar a contribuição final por `n / 5` para encolher amostras incompletas até zero.
- [x] Rodar teste focado e typecheck; ambos devem passar.

### Tarefa 3: Configuração versionada, composição das taxas e clássicos

**Arquivos:**
- Criar: `backend/src/modules/prediction/config.ts`
- Modificar: `backend/src/modules/prediction/predict.ts`
- Modificar: `backend/test/prediction/poisson.test.ts`

**Interfaces:**
- Exportar versão e parâmetros imutáveis em `PREDICTION_CONFIG`.
- Estender `predictFixture(fixture, teams, finishedMatches, recentForm?, ratings?, historicalMatches?)`; chamadas atuais sem `historicalMatches` continuam válidas.
- Exportar `isParityFixture(homeTeamId, awayTeamId): boolean` para catálogo simétrico de pares.
- Preservar os campos públicos `fixtureId`, `lambdaHome`, `lambdaAway`, `scores`, `homeWin`, `draw`, `awayWin`.

- [x] Testar direcionalidade de ataque/defesa de 10 jogos e forma de 5 jogos, forma nos últimos cinco jogos no mando da fixture, fallback suavizado para amostras pequenas, H2H sem amostra, ajuste simétrico de paridade, lambdas limitadas e probabilidade normalizada.
- [x] Rodar `npm --prefix backend test -- test/prediction/poisson.test.ts` e confirmar falha nos casos novos.
- [x] Implementar composição em etapas: taxas da temporada com suavização atual; multiplicadores recentes de ataque e defesa; fator de forma dos últimos cinco; contribuição H2H ponderada conforme tarefa 2; Elo atual; paridade limitada antes do clamp final. Manter parâmetros explícitos e evitar que sinais ausentes alterem as taxas.
- [x] Incluir no catálogo as rivalidades nomeadas na spec, de forma simétrica e isolada da fórmula; documentar como acrescentar confrontos do São Paulo sem comparar nomes livres no preditor.
- [x] Rodar testes focados e typecheck; ambos devem passar.

### Tarefa 4: Avaliação walk-forward com arquivo-base e ablações

**Arquivos:**
- Modificar: `backend/src/modules/prediction/evaluate.ts`
- Teste: `backend/test/prediction/evaluate.test.ts`

**Interfaces:**
- Manter `evaluateWalkForward(teams, seasonMatches)` compatível.
- Adicionar opções opcionais `historicalMatches` e `modelVariant` (`baseline`, `full`, `without-h2h`, `without-parity`) e incluir `season` nos resultados por temporada.

- [x] Testar que cada fixture usa só jogos anteriores ao seu kickoff, que editar placar futuro não muda previsões anteriores, e que o resultado do jogo corrente só entra após prever.
- [x] Testar baseline `v0.1` contra variante integral e ablações com séries sintéticas determinísticas; métricas devem ser finitas para zero fixtures e partidas elegíveis.
- [x] Rodar o teste focado e confirmar falha inicial.
- [x] Implementar avaliação de cada variante reutilizando o mesmo caminho de previsão e produzindo Brier multiclasses e log-loss, agregado e por temporada. Separar seleção temporal de pesos (temporadas 2023–2025) da avaliação final de generalização na temporada 2026; nenhuma partida de 2026 pode influenciar os pesos avaliados nela.
- [x] Rodar teste focado, suíte do backend e typecheck; tudo deve passar.

### Tarefa 5: Histórico cross-season no dashboard e integração

**Arquivos:**
- Modificar: `backend/src/services/dashboard.ts`
- Modificar: `backend/src/scripts/run-model.ts`
- Modificar: `backend/test/dashboard.test.ts`

**Interfaces:**
- Estender `buildDashboard(teams, matches, options)` com `historicalMatches?: readonly Match[]`, preservando chamadas existentes.
- Tabela, forma exibida e jogos simulados continuam derivados apenas da temporada `options.season`; apenas lookup H2H pode usar `historicalMatches` com corte por data.

- [x] Testar que temporadas anteriores podem fornecer H2H e nenhum jogo posterior ao kickoff entra; teste que jogos históricos não mudam tabela nem contagem de fixtures simuladas.
- [x] Rodar o teste focado e confirmar falha inicial.
- [x] Carregar JSONs normalizados locais disponíveis no `run-model.ts`, compor o histórico até a temporada selecionada e passá-lo explicitamente ao dashboard. Falha/ausência de arquivo histórico não pode impedir previsões sem H2H.
- [x] Atualizar versão e strings de metodologia sem alterar o schema ou os campos de previsão do dashboard.
- [x] Rodar teste, suíte do backend, typecheck e geração de snapshot da temporada selecionada; validar snapshot com o schema atual.

### Tarefa 6: Comparação histórica reproduzível e critério de paridade

**Arquivos:**
- Modificar: `backend/src/scripts/run-model.ts`
- Modificar: `backend/src/modules/prediction/evaluate.ts`
- Teste: `backend/test/prediction/evaluate.test.ts`
- Gerados: `data/snapshots/evaluation-2023.json`, `evaluation-2024.json`, `evaluation-2025.json`, `evaluation-2026.json` (quando cada temporada local existir)

- [x] Escrever teste de elegibilidade que confirma os quatro variants/relatórios e contagens estáveis com a mesma semente/dados.
- [x] Implementar gravação de métricas baseline, full e ablações por temporada e agregadas com versão e número de partidas avaliadas.
- [x] Selecionar pesos por busca determinística: peso conjunto de ataque/defesa recentes e forma recente em `[0.05, 0.15, 0.25]`, peso H2H em `[0, 0.1, 0.2]`; usar somente partidas concluídas de 2023–2025 e congelar antes de abrir resultados de teste de 2026. Os pesos das janelas recentes não podem zerar, pois o requisito aprovado é que as métricas recentes participem da previsão.
- [x] Ativar paridade apenas com pelo menos duas temporadas e 700 partidas de desenvolvimento, ao menos 200 partidas de teste, Brier e log-loss menores que a variante sem paridade no teste e nenhuma métrica pior que baseline em mais de 5% em qualquer temporada de desenvolvimento. Caso contrário, fixar contribuição de paridade em zero. Registrar métricas e decisão.
- [x] Rodar `npm run model:run --prefix backend -- --all` e verificar arquivos de avaliação e snapshots; nenhum status não finalizado entra nos cálculos.
- [x] Registrar no `backend/docs/04-prediction.md` resultados observados, amostra, valores finais e limitações; não declarar calibração ou melhora sem suporte nos números.

### Tarefa 7: Regressão final e documentação

**Arquivos:**
- Modificar: `backend/docs/04-prediction.md`
- Validar: backend, snapshots e frontend consumidor sem editar contrato visual

- [x] Documentar métricas de temporada, janelas de 5 e 10, mando, H2H, catálogo de paridade, pesos finais e leitura de avaliação.
- [x] Rodar `npm run test:api`, `npm run typecheck:api`, `npm run build:web` e `npm run test:web` a partir da raiz.
- [x] Conferir que o dashboard preserva shape, soma das probabilidades por jogo é 1, 10 jogos seguem visíveis por time na seção atual, e jogos adiados/em andamento seguem excluídos.
- [x] Revisar documentação, snapshots e diff final; registrar commit apenas se o workspace for um repositório Git válido e a execução escolhida incluir commits.

## Cobertura da especificação

As tarefas 1–2 implementam janelas, mando, corte temporal e H2H; tarefa 3 combina os sinais e paridade; tarefas 4–6 cobrem walk-forward, ausência de vazamento, comparação, ablações e histórico entre temporadas; tarefa 5 mantém cálculo de tabela/simulação separado; tarefa 7 verifica compatibilidade e documentação.
