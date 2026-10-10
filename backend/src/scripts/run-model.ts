import { mkdir, rename, stat, writeFile } from 'node:fs/promises'
import '../config.js'
import { join } from 'node:path'
import { evaluateWalkForward, type WalkForwardMetrics } from '../modules/prediction/evaluate.js'
import { calibratePredictionWeights, aggregateWalkForwardMetrics, shouldActivateParity, PARITY_MIN_DEVELOPMENT_FIXTURES, PARITY_MIN_DEVELOPMENT_SEASONS, type TrainingSeason } from '../modules/prediction/calibrate.js'
import { normalizeHistory } from '../modules/normalization/history.js'
import { listAvailableSeasons, listStoredMatchSeasons, readMatchArchive } from '../modules/raw-data/index.js'
import { normalizedDataDir, rawDataDir, snapshotsDir } from '../paths.js'
import { PREDICTION_CONFIG } from '../modules/prediction/config.js'
import { buildDashboard } from '../services/dashboard.js'
import type { Match, Team } from '../domain/types.js'
import type { PredictionWeights, PredictionVariant } from '../modules/prediction/predict.js'

interface StoredSeason {
  season: number
  teams: Team[]
  matches: Match[]
}

function selectedSeasonArg(): number | 'all' | undefined {
  const argv = process.argv.slice(2)
  if (argv[0] === '--all') return 'all'
  const index = argv.indexOf('--season')
  const raw = index >= 0 ? argv[index + 1] : process.env.FOOTBALL_DATA_SEASON
  if (raw === undefined) return undefined
  const season = Number(raw)
  if (!Number.isInteger(season) || season < 1900 || season > 2200) throw new Error('Season must be a four-digit year.')
  return season
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

function priorHistory(allMatches: readonly Match[], season: number): Match[] {
  return allMatches.filter(match => match.season < season)
}

function withinDevelopmentTolerance(
  contextual: readonly WalkForwardMetrics[],
  baseline: readonly WalkForwardMetrics[],
): boolean {
  const baselineBySeason = new Map(baseline.map(result => [result.season, result]))
  return contextual.every(result => {
    const reference = baselineBySeason.get(result.season)
    if (!reference || result.fixtures === 0 || reference.fixtures === 0) return true
    return result.brierScore <= reference.brierScore * 1.05
      && result.logLoss <= reference.logLoss * 1.05
  })
}

const available = await listAvailableSeasons()
const stored = await listStoredMatchSeasons()
const requested = selectedSeasonArg()
const envSeason = process.env.FOOTBALL_DATA_SEASON ? Number(process.env.FOOTBALL_DATA_SEASON) : undefined
const season = requested === 'all' ? undefined : requested ?? envSeason ?? stored.at(-1)
const targets = requested === 'all' ? stored : season ? [season] : stored.slice(-1)
const latestYear = season ?? targets.at(-1)
if (!targets.length) throw new Error('No season match JSON found under data/raw/. Run npm run data:sync first.')

const simulations = Number(process.env.MODEL_SIMULATIONS ?? 10_000)
const seed = Number(process.env.MODEL_SEED ?? 42)
const rawArchives = new Map<number, Awaited<ReturnType<typeof readMatchArchive>>>()
for (const year of stored.filter(value => available.includes(value))) {
  rawArchives.set(year, await readMatchArchive(year))
}
const combined = normalizeHistory(rawArchives)
const allHistoricalMatches = combined.matches
const seasonData = new Map<number, StoredSeason>()
for (const [year, archive] of rawArchives) {
  const normalized = normalizeHistory(new Map([[year, archive]]))
  seasonData.set(year, { season: year, teams: normalized.teams, matches: normalized.matches })
}

await mkdir(normalizedDataDir, { recursive: true })
await mkdir(snapshotsDir, { recursive: true })
for (const year of targets) {
  if (!available.includes(year)) throw new Error(`Season ${year} is not listed in data/raw/competition.json.`)
  const archive = rawArchives.get(year) ?? await readMatchArchive(year)
  const normalized = normalizeHistory(new Map([[year, archive]]))
  await writeJsonAtomic(join(normalizedDataDir, `matches-${year}.json`), normalized.matches)
  await writeJsonAtomic(join(normalizedDataDir, `teams-${year}.json`), normalized.teams)

  const history = priorHistory(allHistoricalMatches, year)
  const developmentSeasons: TrainingSeason[] = [...seasonData.values()]
    .filter(entry => entry.season < year)
    .map(entry => ({ ...entry, historicalMatches: priorHistory(allHistoricalMatches, entry.season) }))
  const calibration = calibratePredictionWeights(developmentSeasons)
  const noParityWeights: PredictionWeights = { ...calibration.weights, parityWeight: 0 }
  const parityCandidateWeights: PredictionWeights = { ...calibration.weights, parityWeight: PREDICTION_CONFIG.parityCandidateWeight }

  const current = seasonData.get(year) ?? { season: year, teams: normalized.teams, matches: normalized.matches }
  const evaluate = (modelVariant: PredictionVariant, weights: Partial<PredictionWeights> = {}) =>
    evaluateWalkForward(current.teams, current.matches, {
      historicalMatches: history,
      modelVariant,
      weights,
    })
  const baseline = evaluate('baseline')
  const noParity = evaluate('without-parity', noParityWeights)
  const withoutH2H = evaluate('without-h2h', { ...noParityWeights, headToHeadWeight: 0 })
  const parityCandidate = evaluate('full', parityCandidateWeights)

  const developmentBySeason = developmentSeasons.map(entry => ({
    season: entry.season,
    contextual: evaluateWalkForward(entry.teams, entry.matches, {
      historicalMatches: entry.historicalMatches,
      modelVariant: 'without-parity',
      weights: noParityWeights,
    }),
    baseline: evaluateWalkForward(entry.teams, entry.matches, {
      historicalMatches: entry.historicalMatches,
      modelVariant: 'baseline',
    }),
  }))
  const developmentContextual = developmentBySeason.map(result => result.contextual)
  const developmentBaseline = developmentBySeason.map(result => result.baseline)
  const developmentMetrics = aggregateWalkForwardMetrics(developmentContextual)
  const developmentComparisons = developmentSeasons.map((entry, index) => ({
    baseline: developmentBaseline[index], contextual: developmentContextual[index],
  }))
  const parityTrainingFixtures = developmentBySeason.reduce((sum, result) => sum + Math.min(result.baseline.fixtures, result.contextual.fixtures), 0)
  const parityTrainingGate = developmentSeasons.length >= PARITY_MIN_DEVELOPMENT_SEASONS
    && parityTrainingFixtures >= PARITY_MIN_DEVELOPMENT_FIXTURES
    && withinDevelopmentTolerance(developmentContextual, developmentBaseline)
  const parityEnabled = shouldActivateParity(developmentComparisons, noParity, parityCandidate)
  const productionWeights: PredictionWeights = { ...noParityWeights, parityWeight: parityEnabled ? PREDICTION_CONFIG.parityCandidateWeight : 0 }
  const productionVariant: PredictionVariant = parityEnabled ? 'full' : 'without-parity'
  const productionMetrics = parityEnabled ? parityCandidate : noParity

  const currentMatchday = Math.max(0, ...archive.matches.map(match => match.season.currentMatchday ?? 0))
  const sourceSyncedAt = (await stat(join(rawDataDir, `matches-${year}.json`))).mtime.toISOString()
  const dashboard = buildDashboard(normalized.teams, normalized.matches, {
    season: year, currentMatchday, sourceSyncedAt, simulations, seed,
    historicalMatches: history,
    predictionWeights: productionWeights,
  })
  const seasonPath = join(snapshotsDir, `season-${year}.json`)
  await writeJsonAtomic(seasonPath, dashboard)
  if (year === latestYear) await writeJsonAtomic(join(snapshotsDir, 'latest.json'), dashboard)

  const evaluation = {
    season: year,
    modelVersion: PREDICTION_CONFIG.version,
    calibration: {
      trainingSeasons: developmentSeasons.map(entry => entry.season),
      candidatesEvaluated: calibration.candidatesEvaluated,
      candidateGrid: { recent10Recent5AndVenue: [0.05, 0.15, 0.25], headToHead: [0, 0.1, 0.2] },
      selectedWeights: noParityWeights,
      ...developmentMetrics,
      bySeason: developmentBySeason,
      developmentGatePassed: parityTrainingGate,
    },
    variants: { baseline, withoutH2H, withoutParity: noParity, withParity: parityCandidate },
    parity: {
      enabled: parityEnabled,
      testComparedTo: 'withoutParity',
      reason: parityEnabled
        ? 'Brier e log-loss menores no período avaliado e limite de desenvolvimento atendido.'
        : 'Paridade desativada: a condição walk-forward de validação não foi atendida.',
    },
    production: { variant: productionVariant, weights: productionWeights, metrics: productionMetrics },
  }
  await writeJsonAtomic(join(snapshotsDir, `evaluation-${year}.json`), evaluation)
  console.log(`Season ${year}: ${normalized.teams.length} teams, ${dashboard.metadata.finishedMatches} finished, ${dashboard.metadata.pendingMatches} scheduled/timed, ${dashboard.metadata.postponedMatches} postponed; weights=${JSON.stringify(productionWeights)}; parity=${parityEnabled ? 'enabled' : 'disabled'}; Brier=${productionMetrics.brierScore.toFixed(4)}, log-loss=${productionMetrics.logLoss.toFixed(4)}.`)
}
