import { describe, expect, it } from 'vitest'
import { buildDashboard } from '../src/services/dashboard.js'
import type { Match, Team } from '../src/domain/types.js'

const teams: Team[] = ['a', 'b', 'c'].map(id => ({ id, name: id.toUpperCase(), shortName: id.toUpperCase(), crestUrl: null }))
function match(id: string, home: string, away: string, status: Match['status'], homeGoals: number | null, awayGoals: number | null): Match {
  return { id, season: 2024, utcDate: '2024-01-01T12:00:00Z', status, matchday: 1, homeTeamId: home, awayTeamId: away, homeGoals, awayGoals }
}

describe('buildDashboard', () => {
  it('uses one season, excludes postponed and in-play games, and builds the frontend contract', () => {
    const matches = [
      match('1', 'a', 'b', 'FINISHED', 2, 0),
      match('2', 'b', 'c', 'FINISHED', 1, 1),
      match('3', 'a', 'c', 'SCHEDULED', null, null),
      match('4', 'b', 'a', 'POSTPONED', null, null),
      match('5', 'c', 'a', 'IN_PLAY', 1, 0),
      { ...match('6', 'c', 'b', 'FINISHED', 9, 0), season: 2023 },
    ]
    const dashboard = buildDashboard(teams, matches, {
      season: 2024, currentMatchday: 2, sourceSyncedAt: '2024-01-01T00:00:00.000Z',
      generatedAt: '2024-01-02T00:00:00.000Z', simulations: 100, seed: 7,
    })
    expect(dashboard.metadata.finishedMatches).toBe(2)
    expect(dashboard.metadata.pendingMatches).toBe(1)
    expect(dashboard.metadata.postponedMatches).toBe(1)
    expect(dashboard.standings.find(row => row.team.id === 'a')?.goalsFor).toBe(2)
    expect(dashboard.upcomingMatches.map(fixture => fixture.id)).toEqual(['3'])
    expect(dashboard.championshipProbabilities).toHaveLength(3)
    expect(dashboard.recentForm).toHaveLength(3)
    expect(dashboard.championshipProbabilities.reduce((sum, row) => sum + row.titleProbability, 0)).toBeCloseTo(1)
  })

  it('returns the full eligible schedule so each team can select its own ten remaining games', () => {
    const schedule = Array.from({ length: 12 }, (_, index) => [
      match(`palmeiras-${index}`, 'a', index % 2 ? 'b' : 'c', 'SCHEDULED', null, null),
      match(`flamengo-${index}`, 'b', index % 2 ? 'c' : 'a', 'TIMED', null, null),
    ]).flat()
    const dashboard = buildDashboard(teams, schedule, {
      season: 2024, currentMatchday: 20, sourceSyncedAt: '2024-01-01T00:00:00.000Z',
      simulations: 10, seed: 1,
    })
    expect(dashboard.upcomingMatches).toHaveLength(24)
    expect(dashboard.upcomingMatches.every(match => match.status === 'scheduled')).toBe(true)
  })

  it('uses older seasons only as head-to-head context, not as current standings or simulation games', () => {
    const fixture = { ...match('future', 'a', 'b', 'SCHEDULED', null, null), utcDate: '2024-01-01T12:00:00Z' }
    const history = Array.from({ length: 5 }, (_, index) => ({
      ...match(`old-${index}`, 'a', 'b', 'FINISHED', 3, 0), season: 2023,
      utcDate: `2023-0${index + 1}-01T12:00:00Z`,
    }))
    const options = {
      season: 2024, currentMatchday: 1, sourceSyncedAt: '2024-01-01T00:00:00.000Z',
      simulations: 20, seed: 7,
    }

    const withoutHistory = buildDashboard(teams, [fixture], options)
    const withHistory = buildDashboard(teams, [fixture], { ...options, historicalMatches: history })

    expect(withHistory.metadata.finishedMatches).toBe(0)
    expect(withHistory.metadata.pendingMatches).toBe(1)
    expect(withHistory.upcomingMatches[0].homeWin).toBeGreaterThan(withoutHistory.upcomingMatches[0].homeWin)
    expect(withHistory.upcomingMatches[0].awayWin).toBeLessThan(withoutHistory.upcomingMatches[0].awayWin)
  })

  it('does not let a finished match after the fixture kickoff affect that fixture forecast', () => {
    const fixture = { ...match('future', 'a', 'b', 'SCHEDULED', null, null), utcDate: '2024-01-01T12:00:00Z' }
    const laterResult = { ...match('later', 'a', 'c', 'FINISHED', 10, 0), utcDate: '2024-01-02T12:00:00Z' }
    const options = {
      season: 2024, currentMatchday: 1, sourceSyncedAt: '2024-01-01T00:00:00.000Z',
      simulations: 20, seed: 7,
    }

    const withoutLaterResult = buildDashboard(teams, [fixture], options)
    const withLaterResult = buildDashboard(teams, [fixture, laterResult], options)

    expect(withLaterResult.upcomingMatches[0].homeWin).toBeCloseTo(withoutLaterResult.upcomingMatches[0].homeWin)
    expect(withLaterResult.upcomingMatches[0].draw).toBeCloseTo(withoutLaterResult.upcomingMatches[0].draw)
    expect(withLaterResult.upcomingMatches[0].awayWin).toBeCloseTo(withoutLaterResult.upcomingMatches[0].awayWin)
  })
})
