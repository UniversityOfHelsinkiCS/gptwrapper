import express from 'express'

import { PORT } from './util/config'
import { inProduction } from '../config'
import router from './router'
import logger from './util/logger'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'

const app = express()

app.use('/api', (req, res, next) => router(req, res, next))
app.use('/api', (_, res) => res.sendStatus(404))

app.listen(PORT, async () => {
  await connectToDatabase()
  if (!inProduction) await seed()

  logger.info(`Server running on port ${PORT}`)
})
