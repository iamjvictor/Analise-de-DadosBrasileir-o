import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = dirname(fileURLToPath(import.meta.url))

/** Absolute path to the project root, independent of the process working directory. */
export const projectRoot = resolve(moduleDir, '../..')
export const rawDataDir = resolve(projectRoot, 'data/raw')
export const normalizedDataDir = resolve(projectRoot, 'data/normalized')
export const snapshotsDir = resolve(projectRoot, 'data/snapshots')
