# Simulação do campeonato

`simulateSeason()` clona a classificação calculada e sorteia cada partida `SCHEDULED` ou `TIMED` a partir da mesma distribuição de placares mostrada no dashboard. `POSTPONED` e `IN_PLAY` são ignoradas; os demais status também não são elegíveis. Um gerador Mulberry32 com semente definida torna a execução reproduzível. Informe explicitamente a quantidade e a semente; o padrão do script é 10.000 execuções, e 100.000 também é suportado.

Para cada clube, o resultado informa probabilidade de título e de terminar entre os quatro primeiros, pontos finais esperados e posição final média. Quando há ao menos um clube, as probabilidades de título somam 1. Passe os jogos finalizados em `finishedMatches` para aplicar confronto direto em empate exato entre dois clubes.

A classificação simulada considera pontos, vitórias, saldo, gols marcados e, quando possível, pontos/saldo/gols em confronto direto; por fim usa ID do time para manter a ordem determinística. Cartões e o mini-campeonato aplicável a empates múltiplos não estão disponíveis e são tratados pela aproximação descrita em análise.
