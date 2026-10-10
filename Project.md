# Projeto: previsão do Brasileirão

Fonte de dados escolhida: [football-data.org v4](https://www.football-data.org/documentation/quickstart). Em 03/10/2026, o token local retornou a competição `BSA`, temporada 2026, 380 partidas e 20 clubes. As respostas verificadas estão em `data/raw/`.

A API Futebol anterior retornava apenas a edição 2025 nesta conta. Não usar seus endpoints nem seu esquema de autenticação neste projeto.

# 1. Objetivo do MVP

Você vai construir:

```text
Backend local:
- ler e sincronizar JSONs brutos de várias temporadas disponíveis;
- salvar respostas localmente;
- normalizar partidas e times;
- calcular forma dos últimos 10 jogos;
- gerar probabilidades;
- simular o restante do campeonato;
- expor uma API local.

Frontend local:
- exibir classificação;
- exibir forma recente;
- exibir probabilidades de título;
- exibir próximos jogos;
- exibir informações do modelo.
```

O projeto não terá:

```text
- login;
- banco remoto;
- deploy;
- pagamentos;
- atualização em tempo real;
- painel administrativo;
- múltiplos usuários;
- modelo de deep learning.
```

A versão para o vídeo deve parecer um produto, mas ser tecnicamente pequena.

# 2. API escolhida

A API é a [football-data.org v4](https://www.football-data.org/documentation/quickstart). O código confirmado para o Campeonato Brasileiro Série A é `BSA` (`id: 2013`). A temporada atual confirmada começa em `2026-01-28`.

A autenticação usa o header `X-Auth-Token`. O segredo fica apenas no `.env` local:

```env
FOOTBALL_DATA_TOKEN=sua_chave
FOOTBALL_DATA_COMPETITION=BSA
FOOTBALL_DATA_SEASON=2026
```

Nunca enviar o token ao frontend nem salvar o header de autenticação nos arquivos de dados.

# 3. Verificação inicial da API

Após carregar as variáveis do `.env` no shell, consultar:

```bash
curl -sS -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
  "https://api.football-data.org/v4/competitions"

curl -sS -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
  "https://api.football-data.org/v4/competitions/BSA"

curl -sS -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
  "https://api.football-data.org/v4/competitions/BSA/matches?season=2026"

curl -sS -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
  "https://api.football-data.org/v4/competitions/BSA/standings?season=2026"

curl -sS -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
  "https://api.football-data.org/v4/competitions/BSA/teams?season=2026"
```

Resultado verificado em 03/10/2026: 380 partidas (278 `FINISHED`, 60 `TIMED`, 40 `SCHEDULED`, uma `POSTPONED`, uma `IN_PLAY`), 20 times e classificações `TOTAL`, `HOME` e `AWAY` com 20 times cada. Cada clube aparece em 38 jogos; não há IDs de partida duplicados. A tabela calculada a partir dos jogos `FINISHED` coincidiu com a tabela `TOTAL` recebida.

Essas contagens são uma fotografia: podem mudar após novos jogos. O script de sincronização deve validar a estrutura e a temporada em cada execução. Partidas `POSTPONED` e `IN_PLAY` ficam fora da classificação calculada, forma, Elo, previsões e simulação. Quando a API atualizar uma partida para `FINISHED`, o resultado entra na próxima sincronização; se uma partida adiada voltar a `SCHEDULED` ou `TIMED`, ela volta a ser elegível para previsão e simulação. Registre quantas partidas foram excluídas para deixar a fotografia transparente.

# 4. Stack do projeto

Use um monorepo simples:

```text
brasileirao-predictor/
├── backend/
│   ├── src/modules/
│   ├── docs/
│   └── test/
├── frontend/
├── data/
│   ├── raw/
│   ├── normalized/
│   └── snapshots/
├── package.json
├── tsconfig.base.json
└── .env.example
```

## Backend

```text
Node.js
TypeScript
Fastify
Zod
Undici
Pino
tsx
Vitest
```

## Frontend

```text
React
Vite
TypeScript
Tailwind CSS
Recharts
```

## Persistência

Para a primeira versão, use arquivos JSON:

```text
data/raw/
data/normalized/
data/snapshots/
```

Não use banco de dados ainda. O objetivo é gravar um vídeo localmente, e JSON é suficiente, transparente e fácil de depurar.

Se você quiser uma persistência mais organizada, use SQLite depois. Não começaria com PostgreSQL para este MVP.

# 5. Estrutura detalhada

```text
backend/src/
├── server.ts
├── contracts/
├── domain/
├── modules/
│   ├── raw-data/
│   ├── normalization/
│   ├── analysis/
│   ├── prediction/
│   └── simulation/
├── services/dashboard.ts
└── scripts/
    ├── sync-data.ts
    └── run-model.ts
```

Frontend (implementação em `frontend/`):

```text
frontend/src/
├── App.tsx
├── main.tsx
├── lib/
│   └── api.ts
├── components/
│   ├── Header.tsx
│   ├── SummaryCards.tsx
│   ├── TitleProbabilityTable.tsx
│   ├── ProbabilityChart.tsx
│   ├── StandingsTable.tsx
│   ├── RecentFormTable.tsx
│   └── UpcomingMatches.tsx
└── styles/
    └── globals.css
```

# 6. Tipos internos

Não use diretamente o formato da API no modelo. Crie tipos próprios.

## Time

```ts
export type Team = {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string | null;
};
```

## Partida

```ts
export type MatchStatus =
  | "FINISHED"
  | "SCHEDULED"
  | "TIMED"
  | "POSTPONED"
  | "IN_PLAY"
  | "SUSPENDED"
  | "CANCELLED";

export type Match = {
  id: string;
  season: number;
  matchday: number | null;
  utcDate: string | null;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
};
```

## Classificação

```ts
export type StandingRow = {
  team: Team;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};
```

## Forma recente

```ts
export type RecentForm = {
  team: Team;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pointsPerGame: number;
  goalsFor: number;
  goalsAgainst: number;
  sequence: Array<"W" | "D" | "L">;
};
```

# 7. Serviço de acesso à API

Isole a football-data.org no módulo `backend/src/modules/raw-data`. Use `https://api.football-data.org/v4` e o header `X-Auth-Token: $FOOTBALL_DATA_TOKEN`. O modelo lê os arquivos locais; a API não é chamada pelo frontend. A sincronização consulta as partidas das temporadas ausentes e atualiza a temporada escolhida em `FOOTBALL_DATA_SEASON`.

```text
GET /competitions
GET /competitions/BSA
GET /competitions/BSA/matches?season=2026
GET /competitions/BSA/standings?season=2026
GET /competitions/BSA/teams?season=2026
```

O cliente verifica status HTTP, valida integridade do JSON e não registra o token. As partidas fornecem equipes, partidas e placares para o MVP. A classificação é calculada internamente; o snapshot `standings-2026.json` existente serve como comparação da coleta inicial. Não faça chamadas no carregamento do frontend.

O normalizador usa os campos reais de `matches`: `id`, `utcDate`, `status`, `matchday`, `homeTeam.id`, `awayTeam.id` e `score.fullTime.home/away`. Nome, sigla e escudo são lidos dos times incluídos nas partidas.

Não use diretamente o JSON do provedor no domínio. Valide os campos com Zod, normalize os status (`FINISHED`, `TIMED`, `SCHEDULED`, `POSTPONED`, `IN_PLAY` etc.) e rejeite partidas concluídas sem placar final. Use somente `FINISHED` nos resultados atuais e somente `SCHEDULED`/`TIMED` em previsões e simulações. Exclua `POSTPONED` e `IN_PLAY` até a API atualizar seus status.

# 8. Sincronização dos dados

O comando `npm run data:sync` executa:

```text
1. Ler FOOTBALL_DATA_TOKEN, FOOTBALL_DATA_COMPETITION e FOOTBALL_DATA_SEASON.
2. Tentar baixar temporadas do catálogo ainda ausentes, preservando anos locais.
3. Atualizar atomicamente os jogos brutos da temporada configurada.
4. Validar HTTP e correspondência entre `resultSet.count` e partidas recebidas.
5. Relatar anos restritos pela conta sem impedir a atualização da temporada configurada.
6. A modelagem (`npm run model:run`) normaliza as partidas e calcula classificação apenas com jogos `FINISHED`.
```

Respostas reais já coletadas:

```text
data/raw/competitions.json
data/raw/competition.json
data/raw/matches-2023.json
data/raw/matches-2024.json
data/raw/matches-2025.json
data/raw/matches-2026.json
data/raw/manifest-2026.json
```

A resposta bruta permite corrigir o mapeador sem consumir novas requisições e reproduzir a fotografia usada no vídeo. Ao atualizar, grave uma nova fotografia consistente; não misture partidas de um instante com classificação de outro sem revalidar.

# 9. Construção das features

Crie um serviço:

```ts
export class FeatureService {
  getRecentForm(
    matches: Match[],
    teamId: string,
    limit = 10
  ): RecentForm {
    const teamMatches = matches
      .filter(
        (match) =>
          match.status === "FINISHED" &&
          (match.homeTeamId === teamId ||
            match.awayTeamId === teamId)
      )
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, limit);

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let points = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    const sequence: Array<"W" | "D" | "L"> = [];

    for (const match of teamMatches) {
      const isHome = match.homeTeamId === teamId;

      const ownGoals = isHome
        ? match.homeGoals!
        : match.awayGoals!;

      const opponentGoals = isHome
        ? match.awayGoals!
        : match.homeGoals!;

      goalsFor += ownGoals;
      goalsAgainst += opponentGoals;

      if (ownGoals > opponentGoals) {
        wins++;
        points += 3;
        sequence.push("W");
      } else if (ownGoals === opponentGoals) {
        draws++;
        points += 1;
        sequence.push("D");
      } else {
        losses++;
        sequence.push("L");
      }
    }

    return {
      teamId,
      matches: teamMatches.length,
      wins,
      draws,
      losses,
      points,
      pointsPerGame:
        teamMatches.length > 0
          ? points / teamMatches.length
          : 0,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      sequence,
    };
  }
}
```

Depois acrescente:

```text
- forma em casa;
- forma fora;
- média de gols;
- peso de recência;
- força média dos adversários.
```

Para o primeiro vídeo, os últimos dez jogos, pontos por jogo, gols marcados e gols sofridos já são suficientes.

# 10. Modelo Elo

O Elo será usado para estimar a força relativa dos times.

```ts
function expectedScore(
  ratingA: number,
  ratingB: number
): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function updateRating(
  currentRating: number,
  opponentRating: number,
  actualScore: number,
  kFactor = 20
): number {
  const expected = expectedScore(
    currentRating,
    opponentRating
  );

  return currentRating + kFactor * (actualScore - expected);
}
```

Inicialização:

```ts
const DEFAULT_RATING = 1500;
const HOME_ADVANTAGE = 60;
```

Para uma partida:

```ts
const homeAdjustedRating =
  homeRating + HOME_ADVANTAGE;

const expectedHome = expectedScore(
  homeAdjustedRating,
  awayRating
);
```

Use os resultados da temporada em ordem cronológica. Não processe as partidas fora de ordem.

Para melhorar o MVP, inicialize o rating com valores iguais e aplique uma pequena diferença baseada na forma atual. Não tente criar ratings “perfeitos” antes de validar o pipeline.

# 11. Modelo de gols com Poisson

Calcule força ofensiva e defensiva:

```ts
attackStrength =
  teamGoalsForPerGame / leagueGoalsPerTeamPerGame;

defenseStrength =
  teamGoalsAgainstPerGame / leagueGoalsPerTeamPerGame;
```

Uma formulação inicial:

```ts
expectedHomeGoals =
  leagueHomeGoalsPerGame *
  homeAttackStrength *
  awayDefenseStrength;

expectedAwayGoals =
  leagueAwayGoalsPerGame *
  awayAttackStrength *
  homeDefenseStrength;
```

Depois ajuste suavemente pela forma recente:

```ts
expectedHomeGoals =
  expectedHomeGoals * 0.75 +
  recentHomeGoalsRate * 0.25;

expectedAwayGoals =
  expectedAwayGoals * 0.75 +
  recentAwayGoalsRate * 0.25;
```

Esses pesos são provisórios. Você deverá validá-los depois.

Função de Poisson:

```ts
function factorial(n: number): number {
  let result = 1;

  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

function poissonProbability(
  goals: number,
  lambda: number
): number {
  return (
    Math.exp(-lambda) *
    lambda ** goals /
    factorial(goals)
  );
}
```

Calcule placares de 0 a 6:

```ts
type ScoreProbability = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
};
```

Para cada combinação:

```ts
probability =
  poissonProbability(homeGoals, lambdaHome) *
  poissonProbability(awayGoals, lambdaAway);
```

Depois agregue:

```ts
homeWin += homeGoals > awayGoals
  ? probability
  : 0;

draw += homeGoals === awayGoals
  ? probability
  : 0;

awayWin += homeGoals < awayGoals
  ? probability
  : 0;
```

Normalize as probabilidades ao final para garantir que somem 1.

# 12. Modelo híbrido para o MVP

Use Poisson como fonte principal, mas ajuste moderadamente com Elo.

Exemplo conceitual:

```ts
const poissonHomeWin = 0.44;
const poissonDraw = 0.29;
const poissonAwayWin = 0.27;

const eloHomeWin = 0.50;
const eloDraw = 0.27;
const eloAwayWin = 0.23;

const weightPoisson = 0.7;
const weightElo = 0.3;

const homeWin =
  poissonHomeWin * weightPoisson +
  eloHomeWin * weightElo;
```

Depois normalize:

```ts
const total = homeWin + draw + awayWin;

return {
  homeWin: homeWin / total,
  draw: draw / total,
  awayWin: awayWin / total,
};
```

No dashboard, chame isso de:

```text
Modelo: Elo + Poisson
```

Não chame de “IA” se ainda não houver um algoritmo treinado de machine learning. A precisão técnica da descrição ajuda sua autoridade.

# 13. Simulação do campeonato

Calcule a classificação atual somente a partir das partidas `FINISHED` e confronte seus totais com `standings` de tipo `TOTAL`. Simule apenas partidas `SCHEDULED` e `TIMED`. Exclua `POSTPONED` e `IN_PLAY` de classificação, forma, previsões e simulação; exponha a contagem excluída nos metadados. Quando o provedor atualizar o status para um estado elegível, a partida volta a participar conforme esse status.

Em cada simulação, copie as estatísticas atuais, sorteie **um placar** para cada partida elegível `SCHEDULED` ou `TIMED` a partir das distribuições de gols do modelo e atualize pontos, vitórias, gols pró e gols contra. Não simule `POSTPONED` nem `IN_PLAY`. Ordene a tabela final pelos critérios do [regulamento da Série A 2026 da CBF](https://www.cbf.com.br/futebol-brasileiro/noticias/undefined/operario-x-chapecoense/cbf-divulga-tabela-detalhada-das-primeiras-rodadas-do-brasileirao-2026), incluindo confronto direto quando aplicável. A API de partidas não fornece todos os dados para possíveis desempates por cartões; documente um critério determinístico para casos restantes.

Conte títulos, G4, pontos e posição média. Use um gerador pseudoaleatório com semente registrada no snapshot para reproduzir o vídeo. Comece com 10.000 simulações para conferir a lógica e depois use 100.000. Confira que a soma das probabilidades de título dos 20 clubes seja aproximadamente 100%.

# 14. APIs do seu backend

## Saúde

```http
GET /health
```

Resposta:

```json
{
  "status": "ok",
  "service": "brasileirao-predictor"
}
```

## Dashboard

```http
GET /api/dashboard
```

Resposta:

```json
{
  "metadata": {
    "season": 2026,
    "provider": "football-data.org",
    "updatedAt": "2026-10-03T22:30:00.000Z",
    "modelVersion": "v0.1",
    "simulations": 100000
  },
  "championshipProbabilities": [],
  "standings": [],
  "recentForm": [],
  "upcomingMatches": [],
  "methodology": {
    "recentMatchesWindow": 10,
    "rating": "Elo",
    "goalsModel": "Poisson",
    "simulation": "Monte Carlo"
  }
}
```

## Probabilidades do título

```http
GET /api/predictions/champion
```

## Partidas futuras

```http
GET /api/predictions/fixtures
```

## Forma recente

```http
GET /api/teams/:teamId/form
```

# 15. Frontend

O frontend deve ter uma única tela.

## Layout

```text
┌─────────────────────────────────────────┐
│ Brasileirão 2026 Predictor              │
│ Atualizado em... | 100.000 simulações   │
├─────────────────────────────────────────┤
│ Favorito       Probabilidade   Modelo   │
├─────────────────────────────────────────┤
│ Probabilidade de título                  │
│ gráfico de barras                        │
├─────────────────────────────────────────┤
│ Tabela de probabilidades                 │
├─────────────────────────────────────────┤
│ Classificação atual                      │
├─────────────────────────────────────────┤
│ Forma dos últimos 10 jogos               │
├─────────────────────────────────────────┤
│ Próximos jogos                           │
└─────────────────────────────────────────┘
```

## Cards superiores

```text
Maior chance de título
38%

Chance de G4
91%

Simulações
100.000

Rodada atual
28
```

## Gráfico

Use Recharts:

```tsx
<BarChart
  data={probabilities}
  layout="vertical"
  width={700}
  height={500}
>
  <XAxis type="number" domain={[0, 1]} />
  <YAxis dataKey="teamName" type="category" />
  <Tooltip
    formatter={(value: number) =>
      `${(value * 100).toFixed(1)}%`
    }
  />
  <Bar dataKey="titleProbability" fill="#22c55e" />
</BarChart>
```

Converta o valor em porcentagem no tooltip, mas mantenha o valor entre 0 e 1 no backend.

# 16. Comandos do projeto

```json
{
  "scripts": {
    "dev:web": "npm --prefix frontend run dev",
    "dev:api": "npm --prefix backend run dev",
    "data:sync": "npm --prefix backend run data:sync",
    "model:run": "npm --prefix backend run model:run",
    "test:api": "npm --prefix backend test",
    "typecheck:api": "npm --prefix backend run typecheck"
  }
}
```

Fluxo:

```bash
npm install --prefix backend
cp .env.example .env
npm run data:sync
npm run model:run
npm run dev:api
npm run dev:web
```

# 17. Plano por etapas

## Etapa 1 — Criar projeto

```text
- inicializar monorepo;
- configurar TypeScript;
- configurar Fastify;
- configurar React/Vite;
- criar .env.example;
- criar pastas data.
```

Entrega:

```text
Backend e frontend iniciam localmente.
```

## Etapa 2 — Validar API (concluída em 03/10/2026)

```text
- token autenticado na football-data.org;
- competição BSA e temporada 2026 confirmadas;
- competição, partidas, classificação e times salvos em data/raw/;
- 380 partidas, 20 clubes e classificação TOTAL conferidos.
```

Entrega: arquivos e `data/raw/manifest-2026.json` já presentes no repositório local.

## Etapa 3 — Normalizar

```text
- analisar o JSON real;
- criar mapper;
- extrair times;
- extrair partidas;
- converter datas;
- converter placares;
- padronizar status;
```

Entrega:

```text
data/normalized/teams.json
data/normalized/matches.json
```

## Etapa 4 — Classificação

```text
- calcular pontos;
- calcular jogos;
- calcular vitórias;
- calcular empates;
- calcular derrotas;
- calcular gols;
- calcular saldo;
```

Compare a classificação calculada com a classificação publicada pela API.

Entrega:

```text
classificação atual consistente.
```

## Etapa 5 — Forma recente

```text
- últimos 10 jogos;
- pontos por jogo;
- gols feitos;
- gols sofridos;
- sequência V/E/D;
- forma em casa;
- forma fora.
```

Entrega:

```text
features.json
```

## Etapa 6 — Modelo

```text
- Elo;
- Poisson;
- probabilidades por partida;
- testes de soma das probabilidades;
- verificação manual de alguns confrontos.
```

Entrega:

```text
predictions.json
```

## Etapa 7 — Simulação

```text
- pontuação atual;
- partidas futuras;
- 10.000 simulações;
- depois 100.000;
- título;
- G4;
- posição média;
- pontos médios.
```

Entrega:

```text
data/snapshots/latest.json
```

## Etapa 8 — Backend

```text
- /health;
- /api/dashboard;
- /api/predictions/champion;
- /api/standings;
- /api/matches;
```

Entrega:

```text
frontend consegue consumir um único endpoint.
```

## Etapa 9 — Frontend

```text
- cabeçalho;
- cards;
- gráfico;
- tabela de título;
- classificação;
- forma;
- próximos jogos;
- transparência metodológica.
```

## Etapa 10 — Gravação

```text
- rodar sync;
- rodar model;
- abrir dashboard;
- gravar terminal;
- gravar explicação;
- mostrar resultado;
- mostrar limitações.
```

# 18. Controle da cota da API

A [documentação da football-data.org](https://www.football-data.org/documentation/api) informa limite de 10 requisições por minuto para clientes autenticados no plano gratuito. Consulte os quatro recursos em sequência durante a sincronização manual, salve as respostas localmente e respeite `429`/`Retry-After` quando necessário.

O frontend nunca chama a API externa. O token permanece somente no `.env` do backend; `.env` está no `.gitignore`.

# 19. Testes obrigatórios

Crie testes para:

```text
- vitória soma 3 pontos;
- empate soma 1 ponto;
- derrota soma 0;
- últimos 10 jogos são selecionados corretamente;
- jogo futuro não entra na forma;
- probabilidades somam 1;
- simulação não altera o objeto original;
- todos os times aparecem;
- título + não título é consistente;
- classificação possui 20 clubes;
```

Exemplo:

```ts
it("calcula três pontos para uma vitória", () => {
  const form = calculateForm([
    {
      homeTeamId: "a",
      awayTeamId: "b",
      homeGoals: 2,
      awayGoals: 0,
      status: "finished",
    },
  ], "a");

  expect(form.points).toBe(3);
  expect(form.wins).toBe(1);
});
```

# 20. O que mostrar no vídeo

Mostre um fluxo reproduzível:

```text
1. “Vou atualizar os dados da API.”
2. Terminal: npm run data:sync
3. “Agora o modelo recalcula a forma dos últimos 10 jogos.”
4. Terminal: npm run model:run (ou `npm run model:run -- --all` para todas as temporadas com JSON local)
5. Dashboard abre.
6. Ranking de probabilidades aparece.
7. Você explica Elo, Poisson e Monte Carlo.
8. Mostra data, rodada e quantidade de simulações.
9. Explica que são probabilidades, não certezas.
```

No dashboard, deixe visível:

```text
Temporada: selecionada na configuração/consulta
Dados até: rodada XX
Janela recente: últimos 10 jogos
Modelo: Elo + Poisson + Monte Carlo
Simulações: 10.000 por padrão (configurável)
Última atualização: data e hora
```

# 21. Escopo técnico final

O pipeline guarda arquivos separados por temporada; a coleta disponível no token atual inclui 2023–2025, além dos arquivos fornecidos para 2026:

```text
data/raw/competition.json
data/raw/matches-YYYY.json
data/normalized/teams-YYYY.json
data/normalized/matches-YYYY.json
data/snapshots/latest.json
data/snapshots/season-YYYY.json
```

E nestes comandos:

```bash
npm run data:sync
npm run model:run
npm run dev:api
```

A arquitetura final será:

```text
data/raw/matches-YYYY.json
   ↓
normalização por temporada
   ↓
JSON normalizado
   ↓
feature.service.ts
   ↓
Elo + Poisson
   ↓
Monte Carlo
   ↓
season-YYYY.json / latest.json
   ↓
Fastify
   ↓
React dashboard
```

A validação manual, coleta de arquivos acessíveis, normalização, análise, modelo, simulação e API foram implementadas sob `backend/`. A conta atual permite temporadas 2023–2025; o arquivo 2026 já existia. Temporadas 2017–2022 retornaram HTTP 403 e permanecem ausentes até a conta permitir baixá-las ou os arquivos serem fornecidos. Cada execução processa apenas partidas finalizadas para análise; adiadas e em andamento não contam até a API atualizar seus status.
