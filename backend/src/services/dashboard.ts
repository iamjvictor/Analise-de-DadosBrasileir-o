import type { Match, Team } from '../domain/types.js'
import { calculateSeasonElo } from '../modules/analysis/elo.js'
import { getRecentForm } from '../modules/analysis/form.js'
import { calculateStandings } from '../modules/analysis/standings.js'
import { predictFixture } from '../modules/prediction/predict.js'
import type { PredictionWeights } from '../modules/prediction/predict.js'
import { PREDICTION_CONFIG } from '../modules/prediction/config.js'
import { simulateSeason } from '../modules/simulation/monteCarlo.js'
import { dashboardResponseSchema, type DashboardResponse } from '../contracts/dashboard.js'

export interface BuildDashboardOptions {
  season: number
  currentMatchday: number
  sourceSyncedAt: string
  generatedAt?: string
  simulations?: number
  seed?: number
  historicalMatches?: readonly Match[]
  predictionWeights?: Partial<PredictionWeights>
}

export function buildDashboard(teams: readonly Team[], matches: readonly Match[], options: BuildDashboardOptions): DashboardResponse {
  const seasonMatches = matches.filter(match => match.season === options.season)
  const finished = seasonMatches.filter(match => match.status === 'FINISHED' && match.homeGoals !== null && match.awayGoals !== null)
  const pending = seasonMatches.filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
  const postponedMatches = seasonMatches.filter(match => match.status === 'POSTPONED').length
  const standings = calculateStandings(teams, finished)
  const form = new Map(teams.map(team => [team.id, getRecentForm(team, finished, 10)]))
  const fixturePredictions = new Map(pending.map(match => {
    const eligibleFinished = match.utcDate === null
      ? []
      : finished.filter(previous => previous.utcDate !== null && previous.utcDate < match.utcDate!)
    const fixtureForm = new Map(teams.map(team => [team.id, getRecentForm(team, eligibleFinished, 10)]))
    const ratings = calculateSeasonElo(teams, eligibleFinished)
    return [match.id, predictFixture(
      match, teams, eligibleFinished, fixtureForm, ratings, options.historicalMatches ?? [],
      { weights: options.predictionWeights },
    )] as const
  }))
  const simulations = options.simulations ?? 10_000
  const seed = options.seed ?? 42
  const parityEnabled = (options.predictionWeights?.parityWeight ?? PREDICTION_CONFIG.parityWeight) > 0
  const summary = simulateSeason(standings, pending, fixturePredictions, { runs: simulations, seed, finishedMatches: finished })
  const teamById = new Map(teams.map(team => [team.id, team]))
  const titleChances = summary.teams.map(chance => ({
    team: teamById.get(chance.teamId)!, titleProbability: chance.titleProbability,
    top4Probability: chance.top4Probability, expectedPoints: chance.expectedPoints,
    averagePosition: chance.averagePosition,
  })).sort((a, b) => a.averagePosition - b.averagePosition)
  const standingViews = standings.map((row, index) => ({ ...row, position: index + 1 }))
  const recentForm = teams.map(team => form.get(team.id)!)
  const upcomingMatches = pending
    .sort((a, b) => String(a.utcDate ?? '').localeCompare(String(b.utcDate ?? '')) || a.id.localeCompare(b.id))
    .map(match => {
      const prediction = fixturePredictions.get(match.id)!
      return {
        id: match.id, utcDate: match.utcDate, round: match.matchday, status: 'scheduled' as const,
        homeTeam: teamById.get(match.homeTeamId)!, awayTeam: teamById.get(match.awayTeamId)!,
        homeWin: prediction.homeWin, draw: prediction.draw, awayWin: prediction.awayWin,
      }
    })
  return dashboardResponseSchema.parse({
    metadata: {
      competition: 'BSA', season: options.season, provider: 'football-data.org',
      sourceSyncedAt: options.sourceSyncedAt, generatedAt: options.generatedAt ?? new Date().toISOString(),
      currentMatchday: options.currentMatchday, modelVersion: PREDICTION_CONFIG.version, simulations, seed,
      finishedMatches: finished.length, pendingMatches: pending.length, postponedMatches,
    },
    championshipProbabilities: titleChances, standings: standingViews, recentForm, upcomingMatches,
    methodology: {
      recentMatchesWindow: 10, rating: 'Elo: temporada, inicial 1500, K=20, mando +60',
      goalsModel: `Poisson; ataque/defesa da temporada, últimos 10, fase dos últimos 5, mando e H2H até 5 jogos; paridade em clássicos ${parityEnabled ? 'ativa' : 'inativa'}`,
      simulation: `Monte Carlo determinístico; ${simulations} execuções; seed ${seed}`,
      limitations: [
        'Partidas IN_PLAY, POSTPONED, SUSPENDED e CANCELLED são excluídas de classificação, forma, previsão e simulação.',
        'O desempate por confronto direto é aplicado para empate exato entre dois clubes; demais critérios podem depender de dados oficiais não fornecidos.',
        'A estimativa usa placares e calendário; não incorpora lesões, escalações, xG ou odds.',
        `Ajuste de paridade em clássicos ${parityEnabled ? 'ativado' : 'desativado'} conforme validação walk-forward desta versão.`,
      ],
    },
  })
}
