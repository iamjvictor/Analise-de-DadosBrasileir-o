# Previsões contextuais por partida

**Status:** aprovada pelo usuário; implementação concluída  
**Data:** 2026-10-04

## Objetivo

Evoluir o modelo provisório `v0.1` para que as probabilidades de cada partida considerem desempenho da temporada, produção recente, fase dos últimos cinco jogos, desempenho recente no mando relevante e confrontos diretos historicamente disponíveis. Clássicos e confrontos competitivos identificados explicitamente poderão receber um ajuste de equilíbrio, desde que a avaliação histórica sustente esse ajuste.

O usuário aprovou a interpretação de que “últimos cinco fora” significa os cinco jogos mais recentes do time como visitante, independentemente do adversário, e que o histórico direto entre os dois clubes é um sinal separado, limitado aos confrontos anteriores no mesmo mando quando houver amostra.

## Estado atual do sistema

- `predictFixture()` em `backend/src/modules/prediction/predict.ts` calcula médias de gols da temporada, ataque/defesa por mando, uma parcela de forma ofensiva baseada nos últimos dez jogos e um ajuste Elo.
- `getRecentForm()` em `backend/src/modules/analysis/form.ts` já resume os últimos dez jogos concluídos, mas não separa janelas de cinco jogos nem mando.
- `evaluateWalkForward()` em `backend/src/modules/prediction/evaluate.ts` prevê partidas em ordem cronológica e só adiciona cada resultado ao histórico depois da previsão.
- O gerador do dashboard atualmente passa a cada previsão apenas resultados finalizados da temporada selecionada. Os arquivos brutos locais incluem temporadas 2023–2026, então o serviço precisará fornecer histórico anterior suficiente para confrontos diretos entre temporadas sem incorporar jogos futuros.
- A saída pública de probabilidades de vitória, empate e derrota permanece compatível com o frontend e com Monte Carlo.

## Desenho aprovado

### 1. Sinais de desempenho

Para cada fixture, formar sinais apenas com partidas `FINISHED` que tenham placar completo e data anterior ao kickoff previsto:

1. **Temporada atual:** taxas de gols marcados e sofridos com separação mandante/visitante, mantendo a suavização já existente.
2. **Últimos dez jogos:** gols marcados e sofridos por jogo, com mando combinado, para medir ataque e defesa recentes. Essa janela alimenta métricas explícitas de produção recente, além do resumo atual de forma.
3. **Últimos cinco jogos:** pontos por jogo, gols marcados e gols sofridos, para refletir fase recente. Para o jogo previsto, calcular também a variante contextual dos últimos cinco jogos no mesmo papel de mando: cinco jogos como mandante para o mandante e cinco como visitante para o visitante, sem exigir que os adversários sejam os mesmos.
4. **Confronto direto:** procurar os cinco encontros mais recentes entre os dois clubes em que o clube atualmente mandante também foi mandante. Usar placares anteriores, com peso decrescente por idade. Se houver poucos jogos, reduzir a influência proporcionalmente à quantidade disponível; com nenhum, esse sinal não altera a previsão. Não preencher a amostra com jogos em mando oposto.
5. **Elo:** manter o rating cronológico existente como sinal de força agregada, com ajuste de mando já documentado.

Partidas ao vivo, adiadas, suspensas, canceladas e futuras ficam excluídas de todos os sinais. As funções de previsão precisam aceitar a história elegível em vez de consultar relógio ou arquivos por conta própria, para que o teste walk-forward controle o limite temporal.

### 2. Combinação e ajuste de clássicos

Os sinais ajustam as taxas esperadas de gols da casa e visitante antes da distribuição de Poisson existente. As previsões mantêm lambdas limitadas a `[0.15, 4]`; vitória/empate/derrota continua sendo agregada de uma única distribuição de placares, utilizada também pela simulação.

Os pares de clássico serão uma configuração explícita baseada na lista fornecida pelo usuário (incluindo Flamengo–Fluminense, Flamengo–Palmeiras, Flamengo–Vasco, Palmeiras–Santos e confrontos do São Paulo que forem especificados no catálogo). O mecanismo de paridade deve aproximar as taxas esperadas dos dois lados de forma simétrica e limitada, sem favorecer um clube. O catálogo será separado do cálculo para facilitar revisão e manutenção.

Pesos dos novos sinais e intensidade da paridade não serão escolhidos para fazer uma partida isolada “parecer certa”. Serão avaliados por previsões walk-forward usando somente dados disponíveis antes de cada jogo, comparando com `v0.1` através de Brier multiclasses e log-loss. A avaliação reportará resultado agregado e por temporada, além de ablações para identificar o valor de cada sinal. O ajuste de clássicos só fica ativo com efeito reproduzível e sem piora material nas métricas agregadas; se os dados disponíveis não sustentarem esse efeito, seu peso permanece neutro e essa limitação fica documentada.

### 3. Fronteiras de módulos

- `analysis/form.ts`: estatísticas recentes genéricas e por mando, com limites configuráveis e ordenação determinística.
- Novo módulo de análise de confrontos diretos: seleção temporal, separação pelo mando atual e resumo suavizado dos encontros elegíveis.
- Módulo de configuração do modelo: pesos, limites, versão e pares de clássicos.
- `prediction/predict.ts`: compõe features e produz taxas e probabilidades de uma partida sem buscar dados externos.
- `prediction/evaluate.ts`: walk-forward sem vazamento de resultados; fornecer histórico da temporada e histórico de temporadas anteriores permitido pela data de corte.
- `services/dashboard.ts` / script `run-model.ts`: carregar as temporadas normalizadas disponíveis e fornecer ao preditor o histórico necessário, mantendo a tabela, forma apresentada e simulação limitadas à temporada selecionada.
- `backend/docs/04-prediction.md`: explicar sinais, pesos efetivamente ativos, janelas, paridade, avaliação e limitações.

### 4. Compatibilidade e observabilidade

`MatchPrediction` conservará `fixtureId`, `lambdaHome`, `lambdaAway`, `scores`, `homeWin`, `draw` e `awayWin`. O contrato do dashboard e as probabilidades consumidas pelo frontend não mudam. A versão do modelo e a metodologia textual do snapshot devem identificar as janelas de 5 e 10 jogos, uso de mando, confronto direto e status real do ajuste de clássicos. As estatísticas internas de features podem ser expostas pelo tipo interno de diagnóstico para testes e análise walk-forward, sem aumentar o payload visual do MVP.

### 5. Testes e critérios de aceite

- Testes unitários para corte temporal estrito, ordenação determinística, placar incompleto e exclusão de status não finalizados.
- Testes para janelas com menos de cinco/dez partidas, jogos no mando correspondente e separação de mando oposto.
- Testes de confronto direto: somente encontros entre o par correto, somente mando igual ao fixture, máximo cinco mais recentes, nenhum uso de partidas posteriores ao kickoff e influência reduzida em amostras pequenas.
- Testes do catálogo de clássicos, simetria do ajuste e limites das taxas esperadas.
- Testes mantendo probabilidades finitas, entre 0 e 1 e somando 1; simulação deve continuar amostrando a mesma distribuição prevista.
- Teste walk-forward que demonstre que alterar o placar de uma partida não muda previsões anteriores a ela.
- Rodar avaliação histórica reproduzível nas temporadas locais completas e parciais disponíveis, comparar novo modelo com `v0.1`, registrar resultados Brier/log-loss em JSON de avaliação e descrever o limite de amostra em documentação.
- `npm test` e `npm run typecheck` em `backend/`; gerar novamente snapshots e validar que o dashboard continua compatível com o frontend.

## Fora de escopo

- Coletar xG, escalações, lesões, suspensões, odds ou dados de torcida.
- Ajustar o resultado com opinião manual ou com a posição atual da tabela como atalho para força.
- Mudar a interface pública do dashboard ou o componente de partidas.
- Incluir partidas adiadas ou em andamento em previsões e simulações.
- Alegar que o modelo é treinado ou que as probabilidades são garantias.

## Revisão de consistência

- As janelas recentes e o histórico H2H respeitam um corte anterior ao kickoff; o processamento walk-forward é a autoridade desse corte.
- H2H não é confundido com forma recente: a forma por mando inclui adversários diversos; H2H inclui somente o par e o mando exatos.
- O ajuste de clássicos depende de catálogo explícito e evidência retrospectiva; não presume que todo jogo rotulado clássico deva ser equiprovável.
- Os novos sinais entram antes do Poisson, preservando o contrato atual da previsão e da simulação.
- O plano fica restrito à previsão, análise e sua integração com o serviço existente.
