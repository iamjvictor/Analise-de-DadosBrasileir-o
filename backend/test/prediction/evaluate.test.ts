import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../../src/domain/types.js';
import { evaluateWalkForward } from '../../src/modules/prediction/evaluate.js';

const teams: Team[] = ['a', 'b'].map(id => ({ id, name: id, shortName: id, crestUrl: null }));
const match = (id: string, date: string, homeGoals: number, awayGoals: number): Match => ({
  id, season: 2025, utcDate: date, status: 'FINISHED', matchday: Number(id),
  homeTeamId: 'a', awayTeamId: 'b', homeGoals, awayGoals,
});

describe('walk-forward prediction evaluation', () => {
  it('does not let later results change an earlier fixture forecast', () => {
    const matches = [
      match('1', '2025-01-01T12:00:00Z', 1, 0),
      match('2', '2025-01-08T12:00:00Z', 0, 1),
      match('3', '2025-01-15T12:00:00Z', 2, 0),
    ];
    const alteredLater = [matches[0], { ...matches[1], homeGoals: 9, awayGoals: 0 }, matches[2]];
    const forecast = (rows: readonly Match[]) => {
      const recorded: Array<{ fixtureId: string; lambdaHome: number; lambdaAway: number }> = [];
      evaluateWalkForward(teams, rows, { onPrediction: prediction => recorded.push(prediction) });
      return recorded[0];
    };

    expect(forecast(matches)).toEqual(forecast(alteredLater));
    expect(forecast(matches)?.fixtureId).toBe('1');
  });

  it('reports selected season and model variant with finite metrics', () => {
    const metrics = evaluateWalkForward(teams, [
      match('1', '2025-01-01T12:00:00Z', 1, 0),
      match('2', '2025-01-08T12:00:00Z', 0, 0),
    ], { modelVariant: 'without-h2h' });

    expect(metrics.season).toBe(2025);
    expect(metrics.modelVariant).toBe('without-h2h');
    expect(Number.isFinite(metrics.brierScore)).toBe(true);
    expect(Number.isFinite(metrics.logLoss)).toBe(true);
  });

  it('does not treat another match at the same kickoff as prior evidence', () => {
    const first = match('1', '2025-01-01T12:00:00Z', 9, 0);
    const simultaneous: Match = { ...first, id: '2', utcDate: first.utcDate, homeTeamId: 'b', awayTeamId: 'a', homeGoals: 0, awayGoals: 1 };
    const forecastSecond = (rows: readonly Match[]) => {
      const recorded: Array<{ fixtureId: string; lambdaHome: number; lambdaAway: number }> = [];
      evaluateWalkForward(teams, rows, { onPrediction: prediction => recorded.push(prediction) });
      return recorded.find(prediction => prediction.fixtureId === '2');
    };

    expect(forecastSecond([first, simultaneous])).toEqual(forecastSecond([simultaneous]));
  });
});
