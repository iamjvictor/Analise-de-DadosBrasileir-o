import dotenv from 'dotenv'
import { join } from 'node:path'
import { projectRoot } from './paths.js'

// Keep the one project .env at the repository root; it is never served to the web app.
dotenv.config({ path: join(projectRoot, '.env'), quiet: true })
