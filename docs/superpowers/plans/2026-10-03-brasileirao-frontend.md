# Brasileirão 2026 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma página local que explique a situação do Brasileirão 2026 e apresente as probabilidades produzidas pelo backend com clareza para a gravação do vídeo.

**Architecture:** React/Vite consulta apenas `GET /api/dashboard` do Fastify. A tela usa o contrato tipado de `@brasileirao/contracts`; durante o desenvolvimento, uma fixture de teste com o mesmo contrato permite trabalhar antes de existir um snapshot real. Nenhum componente conhece o JSON da football-data.org.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, Recharts, Vitest e React Testing Library.

**Spec:** `Project.md`, seções 1, 14–17 e 20–21; contrato em `docs/superpowers/plans/2026-10-03-brasileirao-backend.md`, seção “Contrato compartilhado”.

## Global Constraints

- Página única, sem login, polling em tempo real ou chamada direta à football-data.org.
- O backend é dono de toda estatística e probabilidade. O frontend apenas formata e apresenta números.
- Valores de probabilidade chegam entre 0 e 1; exibir em `%` com uma casa decimal. Pontos médios e posição média usam uma casa decimal.
- Datas vêm em UTC; exibir em `America/Sao_Paulo`, `pt-BR`. Partidas `POSTPONED` e `IN_PLAY` são excluídas da tela de partidas e dos cálculos; mostrar as contagens excluídas em metodologia/metadados.
- Mostrar fonte, horário da coleta, horário do modelo, temporada, rodada, número de simulações e limites metodológicos.
- Não usar valores de exemplo como se fossem dados reais. Fixture de teste fica só em `test/`.

## Direção visual e estrutura

Página esportiva editorial: fundo grafite, tipografia clara, vermelho como acento e separadores discretos. Hierarquia: cabeçalho e metadados → favorito e indicadores → barras de chance de título → tabela completa → classificação e forma → próximos jogos → metodologia. Evitar uma pilha de cartões idênticos: os indicadores podem ser compactos; dados densos ficam em tabela e gráfico. Em telas estreitas, o gráfico mantém nomes legíveis e a classificação usa rolagem horizontal com cabeçalho fixo onde possível. Escudos complementam o nome, sem serem a única identificação.

`GET /api/dashboard` é a única dependência de dados. Vite encaminha `/api` para `http://localhost:3333`. O contrato define 20 clubes nas tabelas; `upcomingMatches` contém até dez partidas. Não calcular probabilidade de G4 de um clube diferente do favorito por engano: o indicador usa a mesma linha de `championshipProbabilities` que gerou o favorito.

## Review Focus

1. API indisponível ou `503 snapshot_unavailable`: mostrar mensagem acionável e opção de tentar novamente, sem inventar números (Task 1/6).
2. Fotografia desatualizada ou metadados incompletos: mostrar a data real da coleta e estado vazio controlado (Tasks 2/6).
3. Probabilidade pequena ou zero: mostrar `0,0%` conforme valor recebido, com tooltip preciso; evitar arredondamento que faça totais parecerem matematicamente exatos (Task 3).
4. Nome longo, escudo ausente e viewport móvel: manter identificação e leitura de tabelas (Tasks 3/4).
5. Partida `POSTPONED` ou `IN_PLAY`: não exibir como previsão nem misturar placar parcial com resultados; apresentar somente a contagem excluída (Tasks 5/6).

---

### Task 1: Aplicação, cliente e fixture de contrato

**Files:** Create `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/lib/api.ts`, `frontend/src/test/fixtures/dashboard.ts`, `frontend/src/lib/api.test.ts`. Modify root `package.json` para `dev:web`, `dev` e build do frontend.

**Interfaces:** `fetchDashboard(signal?: AbortSignal): Promise<DashboardResponse>`; `App` controla `loading | ready | unavailable | error`. Contrato e Zod schema em `frontend/src/contracts/dashboard.ts`.

- [x] Escrever teste para `200` válido, `503 snapshot_unavailable`, resposta malformada e erro de rede. A fixture cobre 20 equipes e inclui status adiados/ao vivo nos dados brutos, mas a resposta de dashboard contém apenas jogos elegíveis.
- [x] Executar teste e confirmar falha.
- [x] Configurar Vite, TypeScript, Tailwind e proxy `/api`; implementar cliente que valida a resposta com `dashboardResponseSchema` e não acessa a API externa.
- [x] Executar teste e `npm run typecheck`; confirmar sucesso. Abrir a página e verificar estado de carregamento.
- [x] Registrar commit, se Git estiver disponível.

### Task 2: Cabeçalho e indicadores da fotografia

**Files:** Create `frontend/src/components/Header.tsx`, `frontend/src/components/SummaryCards.tsx`, `frontend/src/lib/format.ts`, `frontend/src/styles/globals.css`, `frontend/src/components/SummaryCards.test.tsx`.

**Interfaces:** `Header({metadata})`; `SummaryCards({metadata, chances})`; `formatPercent(value)`, `formatLocalDateTime(iso)`, `formatNumber(value)`.

- [x] Testar datas UTC convertidas para `America/Sao_Paulo`, percentuais em `pt-BR`, identificação do favorito e seu próprio G4; testar metadados faltantes sem renderizar `Invalid Date`.
- [x] Executar teste e confirmar falha.
- [x] Implementar cabeçalho com temporada/rodada e indicadores de favorito, chance de título, chance de G4 e simulações. Exibir “Dados coletados em” separado de “Modelo calculado em”.
- [x] Executar teste e `typecheck`; verificar leitura em largura de 390 px e 1280 px.
- [x] Registrar commit, se Git estiver disponível.

### Task 3: Chances de título em gráfico e tabela

**Files:** Create `frontend/src/components/ProbabilityChart.tsx`, `frontend/src/components/TitleProbabilityTable.tsx`, `frontend/src/components/ProbabilityChart.test.tsx`.

**Interfaces:** Ambos recebem `chances: TitleChanceView[]` ordenadas por `titleProbability` decrescente. Tabela mostra clube, título, G4, pontos esperados e posição média.

- [x] Testar 20 clubes, empate em probabilidade, zero e valor abaixo de `0,1%`; verificar que o gráfico e a tabela mostram os mesmos percentuais.
- [x] Executar teste e confirmar falha.
- [x] Implementar barras horizontais com Recharts, altura suficiente para 20 linhas, domínio `[0,1]`, tooltip em `%` e alternativa textual/tabela acessível. Escudo ausente usa iniciais ou sigla.
- [x] Executar teste e `typecheck`; verificar nomes longos e leitura móvel.
- [x] Registrar commit, se Git estiver disponível.

### Task 4: Classificação e forma recente

**Files:** Create `frontend/src/components/StandingsTable.tsx`, `frontend/src/components/RecentFormTable.tsx`, `frontend/src/components/StandingsTable.test.tsx`, `frontend/src/components/RecentFormTable.test.tsx`.

**Interfaces:** `StandingsTable({rows: StandingView[]})`; `RecentFormTable({rows: RecentFormView[]})`. `sequence[0]` é o jogo mais recente; traduzir W/D/L visualmente para V/E/D.

- [x] Testar 20 linhas, ordem por posição, destaque da primeira colocação, pontos/saldo com sinal correto, sequência mais recente primeiro e time com menos de dez jogos.
- [x] Executar testes e confirmar falha.
- [x] Implementar tabelas sem recalcular resultados; cabeçalhos com unidades, escudos opcionais, rolagem horizontal em telas estreitas e foco visível para navegação por teclado.
- [x] Executar testes e `typecheck`; conferir as tabelas com a fixture.
- [x] Registrar commit, se Git estiver disponível.

### Task 5: Jogos futuros e transparência do modelo

**Files:** Create `frontend/src/components/UpcomingMatches.tsx`, `frontend/src/components/Methodology.tsx`, `frontend/src/components/UpcomingMatches.test.tsx`.

**Interfaces:** `UpcomingMatches({matches: FixtureView[]})`; `Methodology({metadata, methodology})`. `metadata` informa quantas partidas `POSTPONED` e `IN_PLAY` foram excluídas.

- [x] Testar data/hora em `pt-BR`, probabilidades mandante/empate/visitante, ausência de jogos `POSTPONED`/`IN_PLAY` na lista e estado sem próximos jogos.
- [x] Executar teste e confirmar falha.
- [x] Implementar lista dos dez próximos confrontos `SCHEDULED`/`TIMED` e bloco curto explicando janela de dez jogos, Elo, Poisson, Monte Carlo, contagens excluídas e limitações dos desempates.
- [x] Executar teste e `typecheck`; verificar que o texto não afirma certeza nem descreve o modelo como IA treinada.
- [x] Registrar commit, se Git estiver disponível.

### Task 6: Integração, estados de erro e revisão visual

**Files:** Modify `frontend/src/App.tsx`, `frontend/src/styles/globals.css`; create `frontend/src/App.test.tsx`.

**Interfaces:** `App` busca uma vez ao abrir e por ação explícita “Tentar novamente”; renderiza as cinco seções da página a partir de um único `DashboardResponse`.

- [x] Testar carregamento, sucesso, `503`, erro de rede, retry e resposta vazia. Nenhum estado pode mostrar números da fixture fora dos testes.
- [x] Executar testes e confirmar falha.
- [x] Integrar componentes, manter títulos/legendas e adicionar estados de carregamento e erro com instrução para executar `npm run model:run` quando não houver snapshot.
- [x] Executar `npm test`, `npm run typecheck` e build do frontend. Fazer inspeção visual em 390 px e 1280 px com dados reais do backend quando o snapshot estiver disponível; conferir sobreposição, contraste, rolagem e escudos ausentes.
- [x] Registrar commit, se Git estiver disponível.

## Aceite do frontend

- Uma única tela mostra as chances de todos os 20 clubes, classificação, forma, próximos jogos e metodologia.
- Nenhum valor é inventado quando o backend está indisponível.
- Probabilidades e datas são formatadas corretamente para o Brasil; o token não chega ao navegador.
- Testes, typecheck e build passam; layout foi inspecionado em desktop e celular.
