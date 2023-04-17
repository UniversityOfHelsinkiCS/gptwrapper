import express from 'express'

import { PORT, inProduction } from './util/config'
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
