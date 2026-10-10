import { describe, expect, it, vi } from 'vitest';
import { listAvailableSeasons, fetchMissingSeasons, refreshSeason } from '../../src/modules/raw-data/index.js';

describe('raw history ingestion', () => {
  it('reads every season year in the existing competition catalog', async () => {
    await expect(listAvailableSeasons()).resolves.toEqual(
      [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    );
  });

  it('fetches only missing seasons, authenticates without exposing the token, and persists raw payloads', async () => {
    const payload = { resultSet: { count: 0 }, matches: [] };
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(payload), { status: 200 }));
    const save = vi.fn(async () => undefined);
    await fetchMissingSeasons({
      seasons: [2025, 2026],
      existingSeasons: [2026],
      token: 'secret-value',
      fetcher,
      save,
      throttleMs: 0,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('/competitions/BSA/matches?season=2025');
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ 'X-Auth-Token': 'secret-value' });
    expect(save).toHaveBeenCalledWith(2025, payload);
  });

  it('fails clearly on unsuccessful API responses without including credentials', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response('invalid token secret-value', { status: 401 }));
    await expect(fetchMissingSeasons({
      seasons: [2025], existingSeasons: [], token: 'secret-value', fetcher,
      save: vi.fn(), throttleMs: 0,
    })).rejects.toThrow(/401/);
  });

  it('can record forbidden archive years and keep collecting later years', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const isForbidden = String(input).includes('season=2024');
      return isForbidden
        ? new Response('', { status: 403 })
        : new Response(JSON.stringify({ resultSet: { count: 0 }, matches: [] }), { status: 200 });
    });
    const forbidden: number[] = [];
    const downloaded = await fetchMissingSeasons({
      seasons: [2023, 2024, 2025], existingSeasons: [], token: 'secret-value', fetcher,
      save: vi.fn(async () => undefined), throttleMs: 0, continueOnForbidden: true,
      onForbidden: season => forbidden.push(season),
    });
    expect(downloaded).toEqual([2025, 2023]);
    expect(forbidden).toEqual([2024]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('refreshes the configured season atomically from a validated API response', async () => {
    const payload = { resultSet: { count: 0 }, matches: [] };
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(payload), { status: 200 }));
    const save = vi.fn(async () => undefined);
    await refreshSeason({ season: 2026, token: 'secret-value', competitionCode: 'BSA', fetcher, save });
    expect(fetcher.mock.calls[0][0]).toContain('/competitions/BSA/matches?season=2026');
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ 'X-Auth-Token': 'secret-value' });
    expect(save).toHaveBeenCalledWith(2026, payload);
  });

  it('rejects duplicate IDs and finished fixtures without full-time scores before saving', async () => {
    const broken = {
      resultSet: { count: 1 },
      matches: [{
        id: 9, status: 'FINISHED', season: { startDate: '2025-01-01' }, utcDate: '2025-01-02T00:00:00Z', matchday: 1,
        homeTeam: { id: 1, name: 'Home', shortName: 'H' }, awayTeam: { id: 2, name: 'Away', shortName: 'A' },
        score: { fullTime: { home: null, away: null } },
      }],
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(broken), { status: 200 }));
    const save = vi.fn(async () => undefined);
    await expect(fetchMissingSeasons({ seasons: [2025], existingSeasons: [], token: 'secret-value', fetcher, save, throttleMs: 0 }))
      .rejects.toThrow(/finished match/);
    expect(save).not.toHaveBeenCalled();

    const duplicate = { ...broken, resultSet: { count: 2 }, matches: [
      { ...broken.matches[0], status: 'SCHEDULED', season: { startDate: '2025-01-01' }, score: { fullTime: { home: null, away: null } } },
      { ...broken.matches[0], status: 'SCHEDULED', season: { startDate: '2025-01-01' }, score: { fullTime: { home: null, away: null } } },
    ] };
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(duplicate), { status: 200 }));
    await expect(fetchMissingSeasons({ seasons: [2025], existingSeasons: [], token: 'secret-value', fetcher, save, throttleMs: 0 }))
      .rejects.toThrow(/unique integers/);
    expect(save).not.toHaveBeenCalled();
  });
});
