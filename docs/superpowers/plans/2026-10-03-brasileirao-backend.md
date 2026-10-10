# Brasileirão Backend Implementation Plan

> **Execução concluída:** o backend foi implementado em `backend/` conforme o pedido do usuário. A especificação foi ajustada para processar temporadas por arquivo de `data/raw/`, e não somente 2026. Os snapshots disponíveis abrangem 2023–2026; a conta da API retornou HTTP 403 para 2017–2022. Consulte `backend/README.md` e `backend/docs/` para comandos e documentação efetivamente entregues.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar os JSONs brutos disponíveis do Brasileirão (temporadas históricas e atual) em fotografias reproduzíveis de classificação, forma, previsões e chances de título, servidas por uma API local.

**Architecture:** Um comando sincroniza a football-data.org e valida os JSONs; outro calcula o modelo e grava `data/snapshots/latest.json`. Fastify apenas lê a última fotografia válida. O contrato `@brasileirao/contracts` é compartilhado com o frontend.

**Tech Stack:** Node.js, TypeScript, Fastify, Zod, Undici, Pino, tsx e Vitest; arquivos JSON locais.

**Spec:** `Project.md`, seções 1–14 e 17–21; dados reais em `data/raw/`.

## Global Constraints

- Competição `BSA`; temporadas vêm do catálogo `data/raw/competition.json`, com seleção da temporada para sincronizar/modelar. Configuração em `.env`, token somente no servidor.
- Sem banco, login, deploy ou consultas externas feitas pelo frontend.
- Usar apenas `FINISHED` para tabela, forma e Elo. Simular somente `SCHEDULED` e `TIMED`. Excluir `POSTPONED` e `IN_PLAY` da tabela calculada, das probabilidades e da simulação. Quando a API atualizar o status para `FINISHED`, incluir o resultado; se um adiado voltar a `SCHEDULED`/`TIMED`, ele volta a ser elegível.
- A coleta de 03/10/2026 tem 380 partidas, 20 clubes, 278 jogos concluídos, um adiado e um em andamento. É uma amostra da temporada 2026; contagens mudam com o tempo.
- O modelo é uma estimativa; parâmetros iniciais ficam versionados e expostos na metodologia. Não apresentá-lo como modelo treinado.
- A seção 12 do `Project.md` é conceitual: neste plano, Elo ajusta os gols esperados de Poisson, preservando uma única distribuição de placares para previsão e simulação.
- Cada tarefa termina com teste focado e verificação de tipos. Não chamar a API externa nos testes.

## Contrato compartilhado

Criar `packages/contracts/src/dashboard.ts` com `DashboardResponse`, `dashboardResponseSchema` (Zod) e os tipos abaixo. IDs internos são strings. Probabilidades são frações entre 0 e 1; o frontend converte para porcentagem.

| Tipo | Campos |
|---|---|
| `TeamView` | `id`, `name`, `shortName`, `crestUrl: string \| null` |
| `StandingView` | `team`, `position`, `played`, `wins`, `draws`, `losses`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points` |
| `RecentFormView` | `team`, `matches`, `wins`, `draws`, `losses`, `points`, `pointsPerGame`, `goalsFor`, `goalsAgainst`, `sequence: ("W"\|"D"\|"L")[]` — mais recente primeiro |
| `TitleChanceView` | `team`, `titleProbability`, `top4Probability`, `expectedPoints`, `averagePosition` |
| `FixtureView` | `id`, `utcDate`, `round: number \| null`, `status: "scheduled"`, `homeTeam`, `awayTeam`, `homeWin`, `draw`, `awayWin` |
| `DashboardResponse` | `metadata`, `championshipProbabilities: TitleChanceView[]`, `standings: StandingView[]`, `recentForm: RecentFormView[]`, `upcomingMatches: FixtureView[]`, `methodology` |

`metadata` contém `competition: "BSA"`, `season` da fotografia, `provider: "football-data.org"`, `sourceSyncedAt`, `generatedAt` (ISO UTC), `currentMatchday`, `modelVersion`, `simulations`, `seed`, `finishedMatches`, `pendingMatches`, `postponedMatches`. `methodology` contém `recentMatchesWindow: 10`, `rating: "Elo"`, `goalsModel: "Poisson"`, `simulation: "Monte Carlo"` e `limitations: string[]`. `upcomingMatches` mostra os próximos dez jogos `SCHEDULED`/`TIMED`; `POSTPONED` e `IN_PLAY` não aparecem e não entram nos cálculos. Temporadas selecionadas têm snapshots próprios; walk-forward histórico avalia jogos finalizados somente com dados anteriores ao jogo.

`GET /api/dashboard` retorna esse objeto ou `503 {"error":"snapshot_unavailable"}` quando ainda não existe fotografia válida. `GET /health` retorna `200 {"status":"ok","service":"brasileirao-predictor"}`. Os demais endpoints citados no `Project.md` ficam fora do MVP porque a tela usa apenas o dashboard.

## Review Focus

1. Token ausente, `401`, `429` ou timeout: falhar com mensagem útil sem registrar segredo e preservar os dados anteriores (Task 2).
2. Partida finalizada sem placar, ID repetido ou equipe fora da lista: rejeitar a sincronização (Task 3).
3. `POSTPONED` com data passada e `IN_PLAY` com placar parcial: excluir ambos de cálculos e fixtures até o status da API mudar (Tasks 3 e 6).
4. Empate na classificação simulada: aplicar pontos, vitórias, saldo e gols; confronto direto de dois times; documentar aproximação nos critérios sem dados (Task 6).
5. Snapshot inexistente, corrompido ou parcialmente gravado: API retorna erro controlado ou a última versão íntegra (Task 7).

---

### Task 1: Workspace, contrato e API mínima

**Files:** Create `package.json`, `tsconfig.base.json`, `packages/contracts/package.json`, `packages/contracts/src/dashboard.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/server.ts`, `apps/api/test/health.test.ts`.

**Interfaces:** Produz `DashboardResponse` e `buildServer(): FastifyInstance`. Scripts raiz: `dev:api`, `data:sync`, `model:run`, `typecheck`, `test`.

- [ ] Escrever `health.test.ts` com `app.inject()` e asserções exatas de status `200` e corpo `/health`.
- [ ] Executar `npm test -- --run apps/api/test/health.test.ts`; confirmar falha pela ausência do servidor.
- [ ] Criar workspace npm, tipos e `dashboardResponseSchema` no pacote compartilhado, e `buildServer()` com `/health`; iniciar servidor somente em `server.ts` quando executado diretamente.
- [ ] Executar teste e `npm run typecheck`; ambos devem passar.
- [ ] Revisar arquivos gerados e registrar um commit, se o diretório estiver em um repositório Git válido.

### Task 2: Cliente HTTP e coleta controlada

**Files:** Create `apps/api/src/config.ts`, `apps/api/src/providers/football-data.client.ts`, `apps/api/src/services/sync.service.ts`, `apps/api/src/scripts/sync-data.ts`, `apps/api/test/sync.test.ts`.

**Interfaces:** `FootballDataClient.get<T>(path: string, query?: Record<string,string>): Promise<T>`; sincronização mantém os arquivos brutos sazonais e completa temporadas ausentes a partir do catálogo, sob o limite de cota. Ler `FOOTBALL_DATA_TOKEN`, `FOOTBALL_DATA_COMPETITION` e `FOOTBALL_DATA_SEASON`.

- [ ] Escrever testes com cliente falso para as quatro rotas, status de erro, `429` com `Retry-After`, timeout e preservação dos arquivos anteriores quando uma rota falha.
- [ ] Executar o arquivo de teste; confirmar falha.
- [ ] Implementar chamadas sequenciais com `X-Auth-Token`, timeout de 30 s, no máximo dois retries de `429`/`5xx`, sem log de headers. Salvar lote em diretório temporário e promover só após todas as respostas válidas.
- [ ] Executar teste e `typecheck`; confirmar sucesso. Rodar o comando real somente quando a cota permitir; os JSONs atuais já são a base de desenvolvimento.
- [ ] Registrar commit, quando Git estiver disponível.

### Task 3: Mapeamento e integridade da temporada

**Files:** Create `apps/api/src/domain/team.ts`, `apps/api/src/domain/match.ts`, `apps/api/src/providers/football-data.mapper.ts`, `apps/api/src/services/validate-season.ts`, `apps/api/test/mapper.test.ts`, `apps/api/test/season-validation.test.ts`.

**Interfaces:** `mapTeams(raw): Team[]`, `mapMatches(raw): Match[]`; `validateSeason(teams, matches): SeasonValidation`. IDs em string; `POSTPONED` vira `postponed`, `TIMED`/`SCHEDULED` viram `scheduled`. `CANCELLED`/`SUSPENDED` exigem revisão manual antes do modelo.

- [ ] Testar mapeamento de um exemplo real de cada status em `data/raw/matches-2026.json`, inclusive placar parcial `IN_PLAY` e data antiga do adiado.
- [ ] Testar rejeição de finalizado sem placar, IDs duplicados, clube desconhecido, temporada errada e calendário incompleto; testar 380 jogos, 20 clubes e 38 jogos por clube nos dados locais.
- [ ] Executar os testes e confirmar falha.
- [ ] Implementar schemas Zod, mapeamento e validações estruturais. Conectar essas validações ao fluxo de sincronização antes de promover dados normalizados; a comparação da tabela fica na Task 4.
- [ ] Executar testes e `typecheck`; confirmar sucesso.
- [ ] Registrar commit, quando Git estiver disponível.

### Task 4: Classificação, forma e Elo

**Files:** Create `apps/api/src/services/standings.service.ts`, `apps/api/src/services/feature.service.ts`, `apps/api/src/services/elo.service.ts`, `apps/api/test/standings.test.ts`, `apps/api/test/features.test.ts`, `apps/api/test/elo.test.ts`.

**Interfaces:** `calculateStandings(teams, finishedMatches): StandingRow[]`; `getRecentForm(matches, teamId, limit=10): RecentForm`; `calculateElo(teams, finishedMatches): Map<string,number>`.

- [ ] Testar 3/1/0 pontos, mando, gols, partidas fora de ordem, menos de dez jogos e exclusão de jogos futuros/ao vivo. Nos JSONs locais, a classificação calculada deve coincidir com `TOTAL` da API; uma divergência bloqueia a promoção do lote normalizado.
- [ ] Testar Elo inicial `1500`, mando `+60`, fator K `20`, atualização simétrica e ordenação cronológica por `utcDate`, depois ID como desempate.
- [ ] Executar testes e confirmar falha.
- [ ] Implementar funções puras sem mutar entradas; sequência de forma em ordem mais recente primeiro.
- [ ] Executar testes e `typecheck`; confirmar sucesso.
- [ ] Registrar commit, quando Git estiver disponível.

### Task 5: Probabilidades de placar

**Files:** Create `apps/api/src/services/poisson.service.ts`, `apps/api/src/services/prediction.service.ts`, `apps/api/test/prediction.test.ts`.

**Interfaces:** `predictFixture(fixture, finishedMatches, recentForm, ratings): MatchPrediction` com `lambdaHome`, `lambdaAway`, `homeWin`, `draw`, `awayWin` e distribuição de placares amostrável.

- [ ] Testar lambdas positivas e finitas, probabilidades entre 0 e 1 somando 1 (tolerância `1e-8`), direção do mando de campo e comportamento com zero jogos.
- [ ] Executar teste e confirmar falha.
- [ ] Implementar Poisson com média de gols da liga por mando, ataque/defesa suavizados com três jogos fictícios à média da liga, e ajuste de forma de 25% na taxa de gols recentes. Aplicar Elo como fator `10 ** ((homeElo + 60 - awayElo) / 1600)` em `lambdaHome` e seu inverso em `lambdaAway`; limitar cada lambda a `[0.15, 4]`. Somar placares até a massa omitida ser menor que `1e-8` e normalizar.
- [ ] Executar teste e `typecheck`; confirmar sucesso. Registrar `modelVersion: "v0.1"` e parâmetros no código.
- [ ] Registrar commit, quando Git estiver disponível.

### Task 6: Monte Carlo e critérios de classificação

**Files:** Create `apps/api/src/services/simulation.service.ts`, `apps/api/src/services/ranking.service.ts`, `apps/api/test/simulation.test.ts`, `apps/api/test/ranking.test.ts`.

**Interfaces:** `simulateSeason(currentStandings, pendingFixtures, predictions, options: {runs:number;seed:number}): SimulationSummary`; `rankSeason(rows, results): StandingRow[]`.

- [ ] Testar semente fixa, conservação dos 20 clubes, ausência de mutação, campeão único por execução e soma de chances de título igual a 1. Confirmar que `POSTPONED`/`IN_PLAY` não alteram pontos nem número de partidas simuladas. Em um cenário de um único jogo, pontos médios simulados devem ficar a até 0,1 ponto da esperança `3 × P(vitória) + P(empate)` após 100.000 execuções.
- [ ] Testar `POSTPONED` e `IN_PLAY` excluídos; `SCHEDULED`/`TIMED` incluídos. Testar ordem por pontos, vitórias, saldo, gols e confronto direto de exatamente dois clubes; quando cartões faltarem, desempatar por ID e registrar limitação.
- [ ] Executar testes e confirmar falha.
- [ ] Implementar amostragem de placares Poisson com PRNG de semente explícita; começar com 10.000 execuções e aceitar 100.000 via configuração. Não adicionar placares parciais de partidas ao vivo nem resultados presumidos para adiadas.
- [ ] Executar testes e `typecheck`; confirmar sucesso e tempo de execução aceitável para uso local.
- [ ] Registrar commit, quando Git estiver disponível.

### Task 7: Snapshot e endpoint do dashboard

**Files:** Create `apps/api/src/services/dashboard.service.ts`, `apps/api/src/scripts/run-model.ts`, `apps/api/src/routes/dashboard.route.ts`, `apps/api/test/dashboard.test.ts`.

**Interfaces:** `buildDashboard(input, options): DashboardResponse`; `GET /api/dashboard` lê `data/snapshots/latest.json`. Scripts raiz `npm run model:run` e `npm run dev:api`.

- [ ] Testar montagem das seis seções do contrato, 20 linhas de tabela/forma/chances, até dez próximos jogos, contagens de status excluídos e metadados. Testar `503` sem snapshot, arquivo corrompido e manutenção da última versão válida se o cálculo falhar.
- [ ] Executar teste e confirmar falha.
- [ ] Implementar leitura de dados normalizados do mesmo lote, exclusão de `POSTPONED`/`IN_PLAY`, escrita em arquivo temporário seguida de renomeação atômica e resposta do Fastify. O servidor não consulta football-data.org.
- [ ] Executar testes, `typecheck` e `npm run model:run` com um lote que tenha `POSTPONED`/`IN_PLAY`; conferir que são excluídos e validar o JSON com o schema do contrato.
- [ ] Registrar commit, quando Git estiver disponível.

## Aceite do backend

- `npm test` e `npm run typecheck` passam.
- `npm run data:sync` busca uma única temporada, valida o lote e não expõe o token.
- `npm run model:run` gera snapshot reproduzível mesmo quando há partidas `IN_PLAY` ou `POSTPONED`, excluindo-as e registrando suas contagens.
- `GET /api/dashboard` devolve o contrato compartilhado; tabela, probabilidades e metadados são consistentes com o lote usado.
