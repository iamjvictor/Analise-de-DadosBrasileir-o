import { describe, expect, it } from 'vitest';
import { normalizeHistory } from '../../src/modules/normalization/history.js';

describe('history normalization', () => {
  it('maps all years, shares team identities, and excludes postponed and in-play rows from finished history', () => {
    const payload = (season: number) => ({ matches: [
      { id: season * 10 + 1, season: { startDate: `${season}-01-01` }, utcDate: `${season}-05-01T12:00:00Z`, status: 'FINISHED', matchday: 1, homeTeam: { id: 10, name: 'Home FC', shortName: 'Home', crest: null }, awayTeam: { id: 20, name: 'Away FC', shortName: 'Away', crest: null }, score: { fullTime: { home: 2, away: 1 } } },
      { id: season * 10 + 2, season: { startDate: `${season}-01-01` }, utcDate: `${season}-05-02T12:00:00Z`, status: 'POSTPONED', matchday: 2, homeTeam: { id: 10, name: 'Home FC', shortName: 'Home', crest: null }, awayTeam: { id: 20, name: 'Away FC', shortName: 'Away', crest: null }, score: { fullTime: { home: null, away: null } } },
      { id: season * 10 + 3, season: { startDate: `${season}-01-01` }, utcDate: `${season}-05-03T12:00:00Z`, status: 'IN_PLAY', matchday: 3, homeTeam: { id: 10, name: 'Home FC', shortName: 'Home', crest: null }, awayTeam: { id: 20, name: 'Away FC', shortName: 'Away', crest: null }, score: { fullTime: { home: 0, away: 0 } } },
    ] });
    const result = normalizeHistory(new Map([[2025, payload(2025)], [2026, payload(2026)]]));
    expect(result.matches).toHaveLength(6);
    expect(result.finishedMatches).toHaveLength(2);
    expect(result.finishedMatches.map(match => match.season)).toEqual([2025, 2026]);
    expect(result.teams).toHaveLength(2);
    expect(result.excludedStatuses).toEqual({ POSTPONED: 2, IN_PLAY: 2 });
  });

  it('preserves other raw statuses in the mapped matches', () => {
    const payload = { matches: [{ id: 1, season: { startDate: '2026-01-01' }, utcDate: '2026-03-01T12:00:00Z', status: 'SCHEDULED', matchday: 1, homeTeam: { id: 1, name: 'A', shortName: 'A', crest: null }, awayTeam: { id: 2, name: 'B', shortName: 'B', crest: null }, score: { fullTime: { home: null, away: null } } }] };
    expect(normalizeHistory(new Map([[2026, payload]])).matches[0].status).toBe('SCHEDULED');
  });
});
