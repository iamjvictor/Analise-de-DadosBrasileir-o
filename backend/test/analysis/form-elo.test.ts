import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../../src/domain/types.js';
import { getRecentForm, getRecentPerformance } from '../../src/modules/analysis/form.js';
import { calculateSeasonElo } from '../../src/modules/analysis/elo.js';
const teams: Team[] = ['a', 'b'].map((id) => ({ id, name: id, shortName: id, crestUrl: null }));
const match = (id: string, date: string, status: Match['status'], hg: number | null, ag: number | null, homeTeamId = 'a', awayTeamId = 'b'): Match => ({ id, season: 2025, utcDate: date, status, matchday: null, homeTeamId, awayTeamId, homeGoals: hg, awayGoals: ag });
describe('form and season Elo', () => {
  it('returns most recent finished matches first and ignores live results', () => {
    const f = getRecentForm(teams[0], [match('1', '2025-01-01', 'FINISHED', 1, 0), match('2', '2025-02-01', 'FINISHED', 0, 1), match('3', '2025-03-01', 'IN_PLAY', 6, 0)], 10);
    expect(f.sequence).toEqual(['L', 'W']);
  });
  it('starts at 1500 and moves ratings in opposite directions', () => {
    const initial = calculateSeasonElo(teams, []);
    const changed = calculateSeasonElo(teams, [match('1', '2025-01-01', 'FINISHED', 1, 0)]);
    expect(initial.get('a')).toBe(1500);
    expect(changed.get('a')! - 1500).toBeCloseTo(20 * (1 - 1 / (1 + 10 ** (-60 / 400))));
    expect(changed.get('a')! + changed.get('b')!).toBeCloseTo(3000);
  });

  it('calculates recent attack, defence and points only before the fixture kickoff', () => {
    const history = [
      match('1', '2025-08-01T12:00:00Z', 'FINISHED', 2, 0),
      match('2', '2025-08-02T12:00:00Z', 'FINISHED', 1, 1, 'c', 'a'),
      match('3', '2025-08-03T12:00:00Z', 'FINISHED', 1, 2),
      match('4', '2025-08-04T12:00:00Z', 'FINISHED', 0, 1, 'c', 'a'),
      match('5', '2025-08-05T12:00:00Z', 'FINISHED', 5, 0),
      match('6', '2025-08-02T15:00:00Z', 'IN_PLAY', 7, 0),
    ];

    const form = getRecentPerformance(teams[0], history, {
      before: '2025-08-04T12:00:00Z', limit: 10, venue: 'any',
    });

    expect(form.matches).toBe(3);
    expect(form.points).toBe(4);
    expect(form.goalsFor).toBe(4);
    expect(form.goalsAgainst).toBe(3);
    expect(form.goalsForPerMatch).toBeCloseTo(4 / 3);
    expect(form.goalsAgainstPerMatch).toBe(1);
  });

  it('filters recent performance to the fixture venue and respects the window', () => {
    const history = [
      match('1', '2025-08-01T12:00:00Z', 'FINISHED', 2, 0),
      match('2', '2025-08-02T12:00:00Z', 'FINISHED', 1, 1, 'c', 'a'),
      match('3', '2025-08-03T12:00:00Z', 'FINISHED', 1, 2),
      match('4', '2025-08-04T12:00:00Z', 'FINISHED', 0, 1, 'c', 'a'),
    ];

    const form = getRecentPerformance(teams[0], history, {
      before: '2025-08-05T00:00:00Z', limit: 2, venue: 'home',
    });

    expect(form.matches).toBe(2);
    expect(form.goalsFor).toBe(3);
    expect(form.goalsAgainst).toBe(2);
    expect(form.pointsPerGame).toBe(1.5);
    expect(form.goalDifferencePerMatch).toBeCloseTo(0.5);
  });
});
