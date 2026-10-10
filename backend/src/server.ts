import Fastify, { type FastifyInstance } from 'fastify'
import './config.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dashboardResponseSchema } from './contracts/dashboard.js'
import { snapshotsDir } from './paths.js'

export function buildServer(options: { snapshotDir?: string } = {}): FastifyInstance {
  const app = Fastify({ logger: false })
  const snapshotDir = options.snapshotDir ?? snapshotsDir

  app.get('/health', async () => ({ status: 'ok', service: 'brasileirao-predictor' }))
  app.get<{ Querystring: { season?: string } }>('/api/dashboard', async (request, reply) => {
    try {
      const season = request.query.season
      if (season !== undefined && !/^\d{4}$/.test(season)) {
        return reply.code(400).send({ error: 'invalid_season' })
      }
      const file = season ? `season-${season}.json` : 'latest.json'
      const content = await readFile(join(snapshotDir, file), 'utf8')
      const dashboard = dashboardResponseSchema.parse(JSON.parse(content))
      return dashboard
    } catch {
      return reply.code(503).send({ error: 'snapshot_unavailable' })
    }
  })
  return app
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const app = buildServer()
  const port = Number(process.env.PORT ?? 3333)
  await app.listen({ host: '0.0.0.0', port })
}
