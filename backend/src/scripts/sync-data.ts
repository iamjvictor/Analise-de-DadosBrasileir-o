import { collectHistory, listStoredMatchSeasons, refreshSeason } from '../modules/raw-data/index.js'
import '../config.js'
import { setTimeout as delay } from 'node:timers/promises'

try {
  const result = await collectHistory()
  if (result.downloadedSeasons.length) {
    console.log(`Downloaded raw match files: ${result.downloadedSeasons.join(', ')}.`)
  } else {
    console.log('All accessible raw match files are already present.')
  }
  if (result.inaccessibleSeasons.length) {
    console.warn(`This API account cannot access archive seasons: ${result.inaccessibleSeasons.join(', ')}. Existing local files remain available for analysis.`)
  }
  if (result.missingSeasons.length) {
    console.warn(`No local archive is available for seasons: ${result.missingSeasons.join(', ')}.`)
  }
  const configuredSeason = process.env.FOOTBALL_DATA_SEASON ? Number(process.env.FOOTBALL_DATA_SEASON) : undefined
  const currentSeason = configuredSeason ?? (await listStoredMatchSeasons()).at(-1)
  if (!currentSeason || !Number.isInteger(currentSeason)) throw new Error('FOOTBALL_DATA_SEASON is invalid and no local season is available to refresh.')
  if (result.downloadedSeasons.length || result.inaccessibleSeasons.length) await delay(6_000)
  await refreshSeason({ season: currentSeason })
  console.log(`Refreshed current raw match data for ${currentSeason}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Season synchronization failed.')
  process.exitCode = 1
}
