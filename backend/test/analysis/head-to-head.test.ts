import { describe, expect, it } from 'vitest';
import type { Match } from '../../src/domain/types.js';
import { getVenueHeadToHead } from '../../src/modules/analysis/headToHead.js';

const match = (id: string, date: string, home: string, away: string, hg: number | null, ag: number | null, status: Match['status'] = 'FINISHED'): Match => ({
  id, season: 2025, utcDate: date, status, matchday: null,
  homeTeamId: home, awayTeamId: away, homeGoals: hg, awayGoals: ag,
});

describe('venue-specific head-to-head', () => {
  it('uses only the five latest completed meetings in the fixture venue before kickoff', () => {
    const history = [
      match('1', '2020-01-01T00:00:00Z', 'home', 'away', 1, 0),
      match('2', '2021-01-01T00:00:00Z', 'home', 'away', 2, 0),
      match('3', '2022-01-01T00:00:00Z', 'home', 'away', 3, 0),
      match('4', '2023-01-01T00:00:00Z', 'home', 'away', 4, 0),
      match('5', '2024-01-01T00:00:00Z', 'home', 'away', 5, 0),
      match('6', '2025-01-01T00:00:00Z', 'home', 'away', 6, 0),
      match('reverse', '2025-03-01T00:00:00Z', 'away', 'home', 0, 8),
      match('other', '2025-04-01T00:00:00Z', 'home', 'other', 0, 8),
      match('future', '2025-06-01T00:00:00Z', 'home', 'away', 8, 0),
      match('live', '2025-05-01T00:00:00Z', 'home', 'away', 8, 0, 'IN_PLAY'),
      match('no-score', '2025-05-02T00:00:00Z', 'home', 'away', null, null),
    ];

    const result = getVenueHeadToHead('home', 'away', history, '2025-06-01T00:00:00Z');

    expect(result.matches).toBe(5);
    expect(result.homeGoalsPerMatch).toBeCloseTo(14 / 3);
    expect(result.awayGoalsPerMatch).toBe(0);
    expect(result.homePointsPerMatch).toBe(3);
    expect(result.awayPointsPerMatch).toBe(0);
  });

  it('returns neutral zero metrics when no same-venue meeting is available', () => {
    const result = getVenueHeadToHead('home', 'away', [
      match('reverse', '2025-01-01T00:00:00Z', 'away', 'home', 0, 3),
      match('late', '2025-04-01T00:00:00Z', 'home', 'away', 3, 0),
    ], '2025-03-01T00:00:00Z');

    expect(result).toEqual({
      matches: 0, homeGoalsPerMatch: 0, awayGoalsPerMatch: 0,
      homePointsPerMatch: 0, awayPointsPerMatch: 0,
    });
  });
});
