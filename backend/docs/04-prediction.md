# Modelo de previsão

O modelo atual é `v0.2-contextual`. Para cada partida, calcula gols esperados de mandante e visitante usando ataque e defesa por mando na temporada selecionada, suavizados em três partidas fictícias com a média da liga. Elo da temporada continua ajustando essas taxas com rating inicial 1500, K=20, mando +60 e escala 1600.

## Sinais recentes

As features são calculadas somente com jogos `FINISHED`, placar completo e kickoff estritamente anterior ao previsto:

- **Temporada:** taxas de gols marcados e sofridos por mando.
- **Últimos 10 jogos:** ataque e defesa por jogo, em qualquer mando, comparados às médias do time na temporada. A média usa prior de três partidas para reduzir ruído.
- **Últimos 5 jogos:** pontos por jogo, gols marcados e sofridos, para medir fase. O fator de pontos é suavizado em direção a 1,5 ponto por partida.
- **Últimos 5 no mesmo mando:** cinco partidas recentes como mandante ou visitante, sem exigir os mesmos adversários. A taxa de gols é suavizada para a média da liga daquele mando.
- **Confronto direto:** até cinco encontros anteriores dos mesmos clubes com o mandante atual também atuando em casa. A partida mais recente pesa 1,0 e as seguintes 0,8, 0,6, 0,4 e 0,2. A influência total é multiplicada por `quantidade / 5`; mando invertido nunca preenche a amostra.

As features multiplicam as taxas de temporada antes do ajuste Elo e do Poisson. As taxas finais são limitadas a `[0.15, 4]`. Duas distribuições Poisson independentes formam uma única distribuição de placares; vitória, empate e derrota são somadas dessa distribuição, que também alimenta Monte Carlo.

## Clássicos

O catálogo configurado usa IDs de clube da football-data.org para Flamengo–Fluminense, Flamengo–Palmeiras, Flamengo–Vasco, Palmeiras–Santos, São Paulo–Palmeiras, São Paulo–Corinthians, São Paulo–Santos e São Paulo–Flamengo. O ajuste é simétrico: aproxima geometricamente os dois gols esperados com peso candidato 0,4, sem favorecer o mandante pelo nome do clube. Assim o mando e a força atual continuam contando, mas a previsão fica menos extrema em clássicos.

A regra de ativação compara o ajuste com a mesma versão sem paridade. Exige no mínimo duas temporadas e 700 partidas de desenvolvimento, 200 partidas avaliadas, Brier e log-loss ambos menores no período avaliado, e nenhuma dessas métricas pode piorar mais de 5% em qualquer temporada de desenvolvimento. Caso contrário, a paridade fica em zero. O resultado da decisão e o peso efetivamente usado ficam em `data/snapshots/evaluation-<temporada>.json` e na metodologia do dashboard.

Chamadas diretas a `predictFixture()` e `buildDashboard()` usam paridade neutra por padrão. O peso candidato 0,4 só é passado pelo script de snapshots depois de passar pelos limites de amostra e métricas acima.

## Ajuste e avaliação histórica

Os pesos de ataque/defesa recentes, forma de cinco jogos e mando são selecionados conjuntamente em `{0.05, 0.15, 0.25}`; o peso H2H é selecionado em `{0, 0.1, 0.2}`. A busca minimiza log-loss nas temporadas anteriores disponíveis, desempata por Brier e depois prefere pesos menores. Os pesos das janelas recentes têm piso positivo para manter os sinais solicitados no modelo. Paridade não participa dessa seleção; é avaliada separadamente. Os pesos escolhidos são congelados antes da avaliação da temporada seguinte.

Para a temporada 2026, a seleção usou 2023–2025 (1.140 partidas walk-forward). O modelo sem paridade obteve Brier agregado 0,6389 e log-loss 1,0686, contra 0,6418 e 1,0710 do baseline `v0.1`. Os pesos selecionados foram 0,05 para cada janela recente e 0,2 para H2H. Nenhuma previsão utilizou partidas posteriores ao kickoff.

Na avaliação walk-forward das 279 partidas finalizadas de 2026, o baseline `v0.1` obteve Brier 0,6561 e log-loss 1,0804. A variante contextual sem paridade obteve 0,6521 e 1,0739; com o peso candidato 0,4, obteve 0,6467 e 1,0662. Nessa amostra a regra ativou o ajuste para clássicos. A melhora é pequena (cerca de 0,8% nas duas métricas frente à variante contextual sem paridade), portanto não é garantia de precisão futura. Consulte o JSON de avaliação para resultados por variante e por temporada.

O walk-forward processa cada temporada em ordem cronológica. Um resultado só entra no histórico depois de prever sua partida; resultados com o mesmo instante de kickoff não alimentam uns aos outros. A regra de paridade do snapshot é escolhida depois de comparar variantes usando os jogos concluídos da temporada-alvo. Portanto, a métrica 2026 é evidência de validação para essa decisão, não um teste cego independente da paridade; uma confirmação futura deve usar uma temporada posterior. A temporada 2026 está em andamento, e o histórico disponível começa em 2023, então as métricas têm amostra limitada. Uma temporada observada não equivale a validação independente em várias competições.

## Limitações

O modelo usa placares e calendário. Não inclui xG, escalações, lesões, suspensões, odds ou força de torcida. IDs de clubes mudam entre competições ou provedores, e o catálogo de clássicos precisa ser revisto se os dados de origem mudarem. As probabilidades são estimativas, não garantias.
