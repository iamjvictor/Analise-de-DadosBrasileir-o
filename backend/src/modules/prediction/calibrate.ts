import type { Match, Team } from '../../domain/types.js';
import { evaluateWalkForward, type WalkForwardMetrics } from './evaluate.js';
import type { PredictionWeights } from './predict.js';

export interface TrainingSeason {
  season: number;
  teams: readonly Team[];
  matches: readonly Match[];
  historicalMatches: readonly Match[];
}

export interface CalibrationResult {
  weights: PredictionWeights;
  candidatesEvaluated: number;
  trainingFixtures: number;
  trainingBrierScore: number;
  trainingLogLoss: number;
}

export interface DevelopmentComparison {
  baseline: WalkForwardMetrics;
  contextual: WalkForwardMetrics;
}

const DEFAULT_WEIGHTS: PredictionWeights = {
  recent10Weight: 0.15,
  recent5FormWeight: 0.15,
  venue5Weight: 0.1,
  headToHeadWeight: 0.1,
  parityWeight: 0,
};

export const PARITY_MIN_DEVELOPMENT_SEASONS = 2;
export const PARITY_MIN_DEVELOPMENT_FIXTURES = 700;
export const PARITY_MIN_HOLDOUT_FIXTURES = 200;

const CANDIDATES: PredictionWeights[] = [0.05, 0.15, 0.25].flatMap((recentWeight) => [0, 0.1, 0.2].map((headToHeadWeight) => ({
  recent10Weight: recentWeight,
  recent5FormWeight: recentWeight,
  venue5Weight: recentWeight,
  headToHeadWeight,
  parityWeight: 0,
})));

/** Selects weights by historical log-loss, with Brier and lower complexity as deterministic tie-breaks. */
export function calibratePredictionWeights(trainingSeasons: readonly TrainingSeason[]): CalibrationResult {
  if (!trainingSeasons.length) return {
    weights: { ...DEFAULT_WEIGHTS }, candidatesEvaluated: 0, trainingFixtures: 0,
    trainingBrierScore: 0, trainingLogLoss: 0,
  };

  const scored = CANDIDATES.map((weights) => {
    const metrics = trainingSeasons.map((entry) => evaluateWalkForward(entry.teams, entry.matches, {
      historicalMatches: entry.historicalMatches,
      modelVariant: 'full',
      weights,
    }));
    const fixtures = metrics.reduce((sum, result) => sum + result.fixtures, 0);
    const brierScore = fixtures ? metrics.reduce((sum, result) => sum + result.brierScore * result.fixtures, 0) / fixtures : 0;
    const logLoss = fixtures ? metrics.reduce((sum, result) => sum + result.logLoss * result.fixtures, 0) / fixtures : 0;
    return { weights, fixtures, brierScore, logLoss };
  });
  scored.sort((a, b) => a.logLoss - b.logLoss
    || a.brierScore - b.brierScore
    || Object.values(a.weights).reduce((sum, value) => sum + value, 0) - Object.values(b.weights).reduce((sum, value) => sum + value, 0));
  const best = scored[0];
  return {
    weights: { ...best.weights },
    candidatesEvaluated: scored.length,
    trainingFixtures: best.fixtures,
    trainingBrierScore: best.brierScore,
    trainingLogLoss: best.logLoss,
  };
}

export function aggregateWalkForwardMetrics(metrics: readonly WalkForwardMetrics[]): Pick<CalibrationResult, 'trainingFixtures' | 'trainingBrierScore' | 'trainingLogLoss'> {
  const fixtures = metrics.reduce((sum, result) => sum + result.fixtures, 0);
  return {
    trainingFixtures: fixtures,
    trainingBrierScore: fixtures ? metrics.reduce((sum, result) => sum + result.brierScore * result.fixtures, 0) / fixtures : 0,
    trainingLogLoss: fixtures ? metrics.reduce((sum, result) => sum + result.logLoss * result.fixtures, 0) / fixtures : 0,
  };
}

/** Enable derby parity only with a holdout gain on both scores and <=5% development regression. */
export function shouldActivateParity(
  development: readonly DevelopmentComparison[],
  holdoutWithoutParity: WalkForwardMetrics,
  holdoutWithParity: WalkForwardMetrics,
): boolean {
  const developmentFixtures = development.reduce((sum, pair) => sum + Math.min(pair.baseline.fixtures, pair.contextual.fixtures), 0);
  if (development.length < PARITY_MIN_DEVELOPMENT_SEASONS
    || developmentFixtures < PARITY_MIN_DEVELOPMENT_FIXTURES
    || Math.min(holdoutWithParity.fixtures, holdoutWithoutParity.fixtures) < PARITY_MIN_HOLDOUT_FIXTURES) return false;
  const developmentGate = development.every(({ baseline, contextual }) => {
    if (baseline.fixtures === 0 || contextual.fixtures === 0) return true;
    return contextual.brierScore <= baseline.brierScore * 1.05
      && contextual.logLoss <= baseline.logLoss * 1.05;
  });
  return developmentGate
    && holdoutWithParity.brierScore < holdoutWithoutParity.brierScore
    && holdoutWithParity.logLoss < holdoutWithoutParity.logLoss;
}
