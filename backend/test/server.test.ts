import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../src/server.js'

const tempDirs: string[] = []

async function tempSnapshotDir() {
  const dir = await mkdtemp(join(tmpdir(), 'bsa-dashboard-'))
  tempDirs.push(dir)
  return dir
}

describe('backend HTTP API', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it('reports service health', async () => {
    const app = buildServer({ snapshotDir: await tempSnapshotDir() })
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', service: 'brasileirao-predictor' })
    await app.close()
  })

  it('serves a valid dashboard snapshot', async () => {
    const snapshotDir = await tempSnapshotDir()
    await writeFile(join(snapshotDir, 'latest.json'), JSON.stringify(validDashboard()))
    await writeFile(join(snapshotDir, 'season-2024.json'), JSON.stringify({
      ...validDashboard(), metadata: { ...validDashboard().metadata, season: 2024 },
    }))
    const app = buildServer({ snapshotDir })
    const response = await app.inject({ method: 'GET', url: '/api/dashboard' })

    expect(response.statusCode).toBe(200)
    expect(response.json().metadata.season).toBe(2026)
    expect(response.json().upcomingMatches).toEqual([])
    const historical = await app.inject('/api/dashboard?season=2024')
    expect(historical.statusCode).toBe(200)
    expect(historical.json().metadata.season).toBe(2024)
    await app.close()
  })

  it('returns a controlled unavailable response for missing or invalid snapshots', async () => {
    const snapshotDir = await tempSnapshotDir()
    const app = buildServer({ snapshotDir })
    expect((await app.inject('/api/dashboard')).statusCode).toBe(503)
    await mkdir(snapshotDir, { recursive: true })
    await writeFile(join(snapshotDir, 'latest.json'), '{broken')
    const response = await app.inject('/api/dashboard')
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({ error: 'snapshot_unavailable' })
    await app.close()
  })

  it('rejects malformed season selectors', async () => {
    const app = buildServer({ snapshotDir: await tempSnapshotDir() })
    const response = await app.inject('/api/dashboard?season=../latest')
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'invalid_season' })
    await app.close()
  })
})

function validDashboard() {
  return {
    metadata: {
      competition: 'BSA', season: 2026, provider: 'football-data.org',
      sourceSyncedAt: '2026-10-03T00:00:00.000Z', generatedAt: '2026-10-03T00:00:00.000Z',
      currentMatchday: 28, modelVersion: 'v0.1', simulations: 10000, seed: 42,
      finishedMatches: 278, pendingMatches: 100, postponedMatches: 1,
    },
    championshipProbabilities: [], standings: [], recentForm: [], upcomingMatches: [],
    methodology: {
      recentMatchesWindow: 10, rating: 'Elo', goalsModel: 'Poisson',
      simulation: 'Monte Carlo', limitations: [],
    },
  }
}
