# Normalização de jogos e times

`normalizeHistory()` recebe um mapa de ano para resposta bruta da football-data.org e produz tipos internos `Team` e `Match`. IDs numéricos do provedor viram strings; o escudo passa a ser `crestUrl`; placares e rodada podem permanecer `null` se a API ainda não os informou.

A coleção normalizada `matches` mantém todos os status válidos, inclusive `SCHEDULED`, `TIMED`, `POSTPONED` e `IN_PLAY`. `finishedMatches` contém apenas partidas `FINISHED` com placar completo e serve de entrada para análise histórica. `excludedStatuses` contabiliza adiadas e em andamento sem remover o registro da resposta normalizada nem do JSON bruto.

Os times são deduplicados pelo ID do provedor entre as temporadas fornecidas. O ano de cada partida vem da chave da temporada usada para ler o arquivo. Se a API retornar um status ainda não mapeado, a normalização falha com uma mensagem clara para evitar tratar o jogo incorretamente.
