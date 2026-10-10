# Brasileirão backend

Backend modular para carregar os snapshots JSON de `../data/raw/`, normalizar temporadas do Brasileirão Série A, calcular indicadores e previsões e servir um dashboard local. Os módulos trabalham por temporada: não há dependência fixa de 2026. Hoje há arquivos locais de 2023, 2024, 2025 e 2026. A temporada escolhida vem de `FOOTBALL_DATA_SEASON` ou da opção `--season YYYY`; `--all` recalcula todas as temporadas que tenham arquivos brutos locais.

## Instalação e execução

Na raiz do projeto:

```sh
npm install --prefix backend
npm run data:sync
npm run model:run
npm run model:run -- --all
npm run dev:api
```

O servidor escuta em `http://localhost:3333`. `GET /health` verifica o serviço; `GET /api/dashboard` lê o snapshot atual, e `GET /api/dashboard?season=2024` lê a fotografia da temporada selecionada quando ela foi gerada. O frontend continua sendo servido em sua própria porta pelo Vite e encaminha chamadas locais para a API.

Para sincronizar a fonte, configure `FOOTBALL_DATA_TOKEN`, `FOOTBALL_DATA_COMPETITION=BSA` e `FOOTBALL_DATA_SEASON` no `.env` da raiz. O token só é usado pelo backend, no header `X-Auth-Token`; os testes não acessam a rede. A sincronização mantém o JSON original em `data/raw/matches-YYYY.json`, incluindo os estados recebidos da API. O coletor consulta o catálogo para baixar históricos que ainda não existem e atualiza atomicamente a temporada configurada.

A conta da API usada na coleta autorizou 2023–2025; as temporadas 2017–2022 retornaram HTTP 403. Elas ficam registradas como ausentes e podem ser adicionadas manualmente em `data/raw/` ou coletadas novamente se o plano da API mudar. Isso não impede a leitura nem os cálculos dos arquivos existentes.

## Pipeline

```text
data/raw/*.json
  → raw-data: descoberta, coleta controlada e leitura validada
  → normalization: equipes e partidas em tipos internos
  → analysis: classificação, forma recente e Elo
  → prediction: probabilidades Poisson e avaliação walk-forward
  → simulation: classificação Monte Carlo
  → dashboard/API: snapshot validado e endpoints locais
```

Somente partidas `FINISHED` entram na tabela, forma, Elo e avaliação. Apenas `SCHEDULED` e `TIMED` são projetadas e simuladas. `POSTPONED`, `IN_PLAY`, `SUSPENDED` e `CANCELLED` ficam fora desses cálculos. Se a API alterar o estado de uma partida numa sincronização futura, ela passa a ser tratada pelo novo status.

## Documentação dos módulos

- [01 — JSON bruto e temporadas](docs/01-json-raw.md)
- [02 — Normalização](docs/02-normalization.md)
- [03 — Análise dos dados](docs/03-analysis.md)
- [04 — Modelo de previsão](docs/04-prediction.md)
- [05 — Simulação do campeonato](docs/05-simulation.md)
- [06 — Dashboard e API](docs/06-dashboard-api.md)

## Verificação

```sh
npm --prefix backend test
npm --prefix backend run typecheck
```

Os testes usam respostas controladas e os snapshots locais; não fazem chamadas externas.
