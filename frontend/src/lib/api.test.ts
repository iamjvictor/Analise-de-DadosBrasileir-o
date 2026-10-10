import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchDashboard, SnapshotUnavailableError, DashboardApiError } from './api'
import { mockDashboardData } from '../test/fixtures/dashboard'

describe('fetchDashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna os dados validados quando a API responde 200 com payload válido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDashboardData,
    } as Response)

    const data = await fetchDashboard()
    expect(data.metadata.competition).toBe('BSA')
    expect(data.championshipProbabilities).toHaveLength(20)
    expect(data.standings).toHaveLength(20)
    expect(data.upcomingMatches).toHaveLength(10)
    expect(data.upcomingMatches.every((m) => m.status === 'scheduled')).toBe(true)
  })

  it('lança SnapshotUnavailableError quando a API responde 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'snapshot_unavailable' }),
    } as Response)

    await expect(fetchDashboard()).rejects.toThrow(SnapshotUnavailableError)
  })

  it('lança DashboardApiError quando a API responde com estrutura malformada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        metadata: { competition: 'INVALID' },
      }),
    } as Response)

    await expect(fetchDashboard()).rejects.toThrow(DashboardApiError)
  })

  it('lança DashboardApiError quando ocorre erro de rede', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'))

    await expect(fetchDashboard()).rejects.toThrow(DashboardApiError)
  })
})
