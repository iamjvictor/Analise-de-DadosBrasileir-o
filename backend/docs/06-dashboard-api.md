# Dashboard e API

## Produção do snapshot

O script de modelo lê os JSONs brutos de uma única temporada, valida e normaliza os jogos, monta classificação e forma, estima probabilidades, simula partidas restantes e valida o resultado final com o schema compartilhado em `src/contracts/dashboard.ts`. Cada temporada recebe seu próprio arquivo de snapshot. A gravação usa arquivo temporário e rename para que o servidor não leia um JSON parcial.

## Rotas

### `GET /health`

Retorna `200` e `{ "status": "ok", "service": "brasileirao-predictor" }`.

### `GET /api/dashboard`

Retorna `data/snapshots/latest.json`, seguindo o contrato usado pelo frontend. Se o arquivo não existir, estiver inválido ou não passar na validação, retorna `503` com `{ "error": "snapshot_unavailable" }`.

### `GET /api/dashboard?season=YYYY`

Seleciona o snapshot histórico daquela temporada. O parâmetro deve ser um ano de quatro dígitos; anos malformados recebem `400 invalid_season`, e uma temporada ainda não calculada recebe a mesma resposta `503` de snapshot indisponível.

## Contrato e transparência

O snapshot contém metadados da competição, temporada, origem e sincronização; probabilidades de título/top 4; classificação; forma; próximos jogos elegíveis; versão e descrição resumida da metodologia. Partidas adiadas ou em andamento não aparecem entre próximos jogos nem entram em pontuação/probabilidades. O campo `postponedMatches` registra adiadas excluídas; demais limitações ficam descritas em `methodology.limitations`.

O Fastify apenas lê snapshots: não consulta a API externa durante uma chamada do frontend. Execute `npm run model:run` para atualizar os resultados depois de sincronizar ou escolher outra temporada.
