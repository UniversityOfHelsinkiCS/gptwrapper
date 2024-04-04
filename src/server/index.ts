import path from 'path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'

import { PORT } from './util/config'
import { inProduction, inStaging } from '../config'
import router from './routes'
import logger from './util/logger'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'
import setupCron from './util/cron'

const app = express()

app.use('/api', (req, res, next) => router(req, res, next))
app.use('/api', (_, res) => res.sendStatus(404))

if (inProduction || inStaging) {
  const DIST_PATH = path.resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../dist'
  )

  const INDEX_PATH = path.resolve(DIST_PATH, 'index.html')

  app.use(express.static(DIST_PATH))
  app.get('*', (_, res) => res.sendFile(INDEX_PATH))
}

app.listen(PORT, async () => {
  await connectToDatabase()
  await seed()
  await setupCron()

  logger.info(`Server running on port ${PORT}`)
})
