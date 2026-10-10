import { describe, expect, it } from 'vitest';
import type { Match, StandingRow, Team } from '../../src/domain/types.js';
import { makeScoreDistribution } from '../../src/modules/prediction/poisson.js';
import { simulateSeason } from '../../src/modules/simulation/monteCarlo.js';
const a: Team = { id: 'a', name: 'A', shortName: 'A', crestUrl: null }; const b: Team = { id: 'b', name: 'B', shortName: 'B', crestUrl: null };
const standings: StandingRow[] = [a, b].map((team, i) => ({ team, position: i + 1, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
const fixture = (id: string, status: Match['status']): Match => ({ id, season: 2026, utcDate: '2026-12-01T00:00:00Z', status, matchday: 38, homeTeamId: 'a', awayTeamId: 'b', homeGoals: null, awayGoals: null });
describe('simulateSeason', () => {
  it('is reproducible and only simulates scheduled/timed fixtures', () => {
    const distribution = { fixtureId: 's', ...makeScoreDistribution(1.5, 0.9) };
    const predictions = new Map([['s', distribution], ['p', { ...distribution, fixtureId: 'p' }], ['i', { ...distribution, fixtureId: 'i' }]]);
    const fixtures = [fixture('s', 'SCHEDULED'), fixture('p', 'POSTPONED'), fixture('i', 'IN_PLAY')];
    const first = simulateSeason(standings, fixtures, predictions, { runs: 200, seed: 42 });
    expect(simulateSeason(standings, fixtures, predictions, { runs: 200, seed: 42 })).toEqual(first);
    expect(first.simulatedMatches).toBe(1);
    expect(first.teams.reduce((s, r) => s + r.titleProbability, 0)).toBeCloseTo(1);
  });
});
