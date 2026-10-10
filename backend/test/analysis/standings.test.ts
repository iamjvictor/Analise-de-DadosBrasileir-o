import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../../src/domain/types.js';
import { calculateStandings } from '../../src/modules/analysis/standings.js';

const a: Team = { id: 'a', name: 'A', shortName: 'A', crestUrl: null };
const b: Team = { id: 'b', name: 'B', shortName: 'B', crestUrl: null };
const game = (id: string, status: Match['status'], homeGoals: number | null, awayGoals: number | null): Match => ({ id, season: 2026, utcDate: '2026-01-01T00:00:00Z', status, matchday: 1, homeTeamId: 'a', awayTeamId: 'b', homeGoals, awayGoals });

describe('calculateStandings', () => {
  it('counts only finished matches and awards 3/1/0 points', () => {
    const rows = calculateStandings([a, b], [game('win', 'FINISHED', 2, 1), game('draw', 'FINISHED', 0, 0), game('live', 'IN_PLAY', 9, 0), game('postponed', 'POSTPONED', null, null)]);
    expect(rows.map(({ team, played, points, goalsFor }) => [team.id, played, points, goalsFor])).toEqual([['a', 2, 4, 2], ['b', 2, 1, 1]]);
  });
});
