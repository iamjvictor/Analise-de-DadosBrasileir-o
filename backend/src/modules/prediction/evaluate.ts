import type { Match, Team } from '../../domain/types.js';
import { getRecentForm } from '../analysis/form.js';
import { calculateSeasonElo } from '../analysis/elo.js';
import { predictFixture, type PredictionVariant, type PredictionWeights } from './predict.js';

export interface FixtureForecast {
  fixtureId: string;
  lambdaHome: number;
  lambdaAway: number;
  homeWin: number;
  draw: number;
  awayWin: number;
}

export interface WalkForwardMetrics {
  fixtures: number;
  brierScore: number;
  logLoss: number;
  season: number | null;
  modelVariant: PredictionVariant;
}

export interface EvaluateWalkForwardOptions {
  historicalMatches?: readonly Match[];
  modelVariant?: PredictionVariant;
  weights?: Partial<PredictionWeights>;
  onPrediction?: (forecast: FixtureForecast) => void;
}

/** Chronological one-step-ahead evaluation; each result is added only after its forecast. */
export function evaluateWalkForward(
  teams: readonly Team[],
  seasonMatches: readonly Match[],
  options: EvaluateWalkForwardOptions = {},
): WalkForwardMetrics {
  const ordered = seasonMatches.filter((match) => match.status === 'FINISHED' && match.homeGoals !== null && match.awayGoals !== null)
    .sort((a, b) => String(a.utcDate ?? '').localeCompare(String(b.utcDate ?? '')) || a.id.localeCompare(b.id));
  const past: Match[] = [];
  const modelVariant = options.modelVariant ?? 'full';
  let brier = 0;
  let logLoss = 0;
  let count = 0;
  for (const match of ordered) {
    const eligiblePast = match.utcDate === null ? [] : past.filter((previous) => previous.utcDate !== null && previous.utcDate < match.utcDate!);
    const form = new Map(teams.map((team) => [team.id, getRecentForm(team, eligiblePast)]));
    const ratings = calculateSeasonElo(teams, eligiblePast);
    const prediction = predictFixture(match, teams, eligiblePast, form, ratings, options.historicalMatches ?? [], {
      variant: modelVariant,
      weights: options.weights,
    });
    options.onPrediction?.({
      fixtureId: match.id,
      lambdaHome: prediction.lambdaHome,
      lambdaAway: prediction.lambdaAway,
      homeWin: prediction.homeWin,
      draw: prediction.draw,
      awayWin: prediction.awayWin,
    });
    const actual = match.homeGoals! > match.awayGoals! ? [1, 0, 0] : match.homeGoals! === match.awayGoals! ? [0, 1, 0] : [0, 0, 1];
    const probabilities = [prediction.homeWin, prediction.draw, prediction.awayWin];
    brier += probabilities.reduce((sum, value, index) => sum + (value - actual[index]) ** 2, 0);
    logLoss -= Math.log(Math.max(1e-15, probabilities[actual.findIndex((value) => value === 1)]));
    count++;
    past.push(match);
  }
  return {
    fixtures: count,
    brierScore: count ? brier / count : 0,
    logLoss: count ? logLoss / count : 0,
    season: seasonMatches[0]?.season ?? null,
    modelVariant,
  };
}
