# Análise dos dados

Os módulos de análise são funções puras que recebem times e partidas. Classificação e forma usam apenas jogos `FINISHED` com placar completo. Jogos `SCHEDULED`, `TIMED`, adiados, em andamento, suspensos ou cancelados não alteram esses cálculos. IDs de times desconhecidos são ignorados, para não criar linhas falsas em temporadas com promoção e rebaixamento. A sequência de forma vem da partida mais recente para a mais antiga e considera dez jogos por padrão.

`getRecentPerformance()` também calcula pontos, gols marcados e sofridos em uma janela e em um mando (`any`, `home` ou `away`). Pode receber o kickoff-alvo em `before`; partidas sem data ou com data igual/posterior são então excluídas. Taxas sem jogos retornam zero e são suavizadas pelo preditor, não pela função de análise.

`getVenueHeadToHead()` resume no máximo os cinco confrontos mais recentes entre os mesmos IDs nos mesmos papéis de mandante/visitante, todos antes do kickoff. Usa pesos de recência 1,0 a 0,2. A função não consulta arquivos nem inverte o mando; quem a chama decide qual histórico está disponível.

`calculateSeasonElo()` inicia cada clube em 1500 pontos, usa fator K=20 e vantagem de mando de +60, e ordena os jogos finalizados por data UTC e ID. Partidas sem data vêm antes das partidas datadas; o ID desempata jogos no mesmo dia. Os ratings reiniciam a cada temporada para evitar presumir continuidade entre elencos e IDs históricos.

O formato recebido não inclui cartões nem todos os detalhes disciplinares. Em empate exato entre dois clubes, usa os jogos diretos disponíveis: pontos, saldo e gols. Empates com três ou mais clubes e critérios disciplinares ausentes terminam em desempate pelo ID do time, de forma repetível. É uma aproximação dos critérios completos da competição.
