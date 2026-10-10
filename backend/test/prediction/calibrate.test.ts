import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../../src/domain/types.js';
import { calibratePredictionWeights, shouldActivateParity } from '../../src/modules/prediction/calibrate.js';
import type { WalkForwardMetrics } from '../../src/modules/prediction/evaluate.js';

const teams: Team[] = ['a', 'b'].map(id => ({ id, name: id, shortName: id, crestUrl: null }));
const rows: Match[] = Array.from({ length: 4 }, (_, index) => ({
  id: String(index + 1), season: 2025, utcDate: `2025-01-0${index + 1}T12:00:00Z`,
  status: 'FINISHED', matchday: index + 1, homeTeamId: 'a', awayTeamId: 'b',
  homeGoals: index % 2 ? 0 : 2, awayGoals: index % 2 ? 1 : 0,
}));

describe('deterministic model-weight selection', () => {
  it('uses conservative versioned defaults when no prior season is available', () => {
    const result = calibratePredictionWeights([]);

    expect(result.trainingFixtures).toBe(0);
    expect(result.weights).toEqual({
      recent10Weight: 0.15, recent5FormWeight: 0.15, venue5Weight: 0.1,
      headToHeadWeight: 0.1, parityWeight: 0,
    });
  });

  it('searches a fixed nine-candidate grid reproducibly on supplied training seasons', () => {
    const input = [{ season: 2025, teams, matches: rows, historicalMatches: [] }];
    const first = calibratePredictionWeights(input);
    const second = calibratePredictionWeights(input);

    expect(first.candidatesEvaluated).toBe(9);
    expect(first.trainingFixtures).toBe(rows.length);
    expect(first.weights).toEqual(second.weights);
    expect(first.weights.recent10Weight).toBeGreaterThan(0);
    expect(first.weights.recent5FormWeight).toBeGreaterThan(0);
    expect(first.weights.venue5Weight).toBeGreaterThan(0);
    expect(first.weights.parityWeight).toBe(0);
  });

  it('activates parity only when both holdout metrics improve and development regressions stay under five percent', () => {
    const metrics = (season: number, brierScore: number, logLoss: number, fixtures = 380): WalkForwardMetrics => ({
      season, fixtures, brierScore, logLoss, modelVariant: 'full',
    });

    expect(shouldActivateParity(
      [
        { baseline: metrics(2024, 0.65, 1.08), contextual: metrics(2024, 0.66, 1.09) },
        { baseline: metrics(2025, 0.65, 1.08), contextual: metrics(2025, 0.65, 1.08) },
      ],
      metrics(2026, 0.65, 1.08, 279), metrics(2026, 0.64, 1.07, 279),
    )).toBe(true);
    expect(shouldActivateParity(
      [
        { baseline: metrics(2024, 0.65, 1.08), contextual: metrics(2024, 0.7, 1.2) },
        { baseline: metrics(2025, 0.65, 1.08), contextual: metrics(2025, 0.65, 1.08) },
      ],
      metrics(2026, 0.65, 1.08, 279), metrics(2026, 0.64, 1.07, 279),
    )).toBe(false);
    expect(shouldActivateParity(
      [
        { baseline: metrics(2024, 0.65, 1.08), contextual: metrics(2024, 0.65, 1.08) },
        { baseline: metrics(2025, 0.65, 1.08), contextual: metrics(2025, 0.65, 1.08) },
      ],
      metrics(2026, 0.65, 1.08, 279), metrics(2026, 0.64, 1.09, 279),
    )).toBe(false);
    expect(shouldActivateParity(
      [
        { baseline: metrics(2024, 0.65, 1.08), contextual: metrics(2024, 0.65, 1.08) },
        { baseline: metrics(2025, 0.65, 1.08), contextual: metrics(2025, 0.65, 1.08) },
      ],
      metrics(2026, 0.65, 1.08, 99), metrics(2026, 0.64, 1.07, 99),
    )).toBe(false);
  });
});
