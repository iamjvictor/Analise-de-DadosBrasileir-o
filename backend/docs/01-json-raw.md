# JSON bruto e temporadas

A fonte dos dados é a pasta `data/raw/` na raiz do projeto. Os arquivos preservam a resposta original da football-data.org, incluindo os envelopes `resultSet`, `competition` e `matches`, para permitir auditoria e validação de quantidade.

`competition.json` informa as temporadas disponíveis no catálogo. `listAvailableSeasons()` extrai o ano de cada `startDate`; atualmente o catálogo lista 2017 a 2026. Cada `matches-YYYY.json` guarda o calendário completo daquela temporada. Hoje temos dados locais de 2023, 2024, 2025 e 2026.

## Sincronizar temporadas ausentes

Na raiz, execute `npm run data:sync`. O coletor lê `FOOTBALL_DATA_TOKEN` e `FOOTBALL_DATA_COMPETITION` do `.env` da raiz (a competição assume `BSA` se não estiver definida). O token é enviado somente no header `X-Auth-Token` e não aparece nos logs nem nos erros.

As chamadas usam `GET /competitions/{code}/matches?season=YYYY`, com espera de seis segundos entre chamadas para respeitar o limite de dez por minuto. A sincronização valida `resultSet.count` contra o tamanho de `matches` e grava a resposta integral em um arquivo temporário antes de promovê-la atomicamente. Arquivos que já existem não são sobrescritos.

HTTP 403 é registrado como temporada inacessível e a coleta continua. Outras respostas de erro, JSON inválido ou arquivo incompleto interrompem a operação. Arquivos históricos existentes são preservados; o ano configurado em `FOOTBALL_DATA_SEASON` é atualizado por gravação atômica. A conta usada aqui permitiu as temporadas 2023–2025; 2017–2022 retornaram HTTP 403. Se o plano da API mudar, execute a sincronização novamente.

A resposta bruta preserva todos os status, inclusive `POSTPONED` e `IN_PLAY`. A ingestão não altera resultados nem tenta inferir placares.
