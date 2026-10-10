import { describe, expect, it } from 'vitest';
import { makeScoreDistribution } from '../../src/modules/prediction/poisson.js';
import { predictFixture } from '../../src/modules/prediction/predict.js';
import type { Match, Team } from '../../src/domain/types.js';
describe('score distribution', () => {
  it('uses one normalized score distribution for all outcome probabilities', () => {
    const d = makeScoreDistribution(1.7, 0.9);
    expect(d.scores.reduce((s, x) => s + x.probability, 0)).toBeCloseTo(1, 10);
    expect(d.homeWin + d.draw + d.awayWin).toBeCloseTo(1, 10);
    expect(d.homeWin).toBeGreaterThan(d.awayWin);
  });

  it('keeps expected goals finite after a prior with zero goals from one venue', () => {
    const teams: Team[] = ['home', 'away'].map(id => ({ id, name: id, shortName: id, crestUrl: null }));
    const prior: Match = { id: '1', season: 2025, utcDate: '2025-01-01T00:00:00Z', status: 'FINISHED', matchday: 1, homeTeamId: 'home', awayTeamId: 'away', homeGoals: 0, awayGoals: 0 };
    const fixture: Match = { ...prior, id: '2', utcDate: '2025-01-02T00:00:00Z', status: 'SCHEDULED', homeGoals: null, awayGoals: null };
    const prediction = predictFixture(fixture, teams, [prior]);
    expect(Number.isFinite(prediction.lambdaHome)).toBe(true);
    expect(Number.isFinite(prediction.lambdaAway)).toBe(true);
    expect(prediction.homeWin + prediction.draw + prediction.awayWin).toBeCloseTo(1, 10);
  });
});
