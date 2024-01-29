import path from 'path'
import { fileURLToPath } from 'url'

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
  const fileName = fileURLToPath(import.meta.url)
  const dirName = path.dirname(fileName)

  const dist = path.resolve(dirName, '../../dist')
  const index = path.resolve(dist, 'index.html')

  app.use(express.static(dist))
  app.get('*', (_, res) => res.sendFile(index))
}

app.listen(PORT, async () => {
  await connectToDatabase()
  await seed()
  await setupCron()

  logger.info(`Server running on port ${PORT}`)
})
