import path from 'path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import session from 'express-session'
import passport from 'passport'
import 'express-async-errors'

import { PORT, SESSION_SECRET } from './util/config'
import { inCI, inProduction, inStaging } from '../config'
import router from './routes'
import logger from './util/logger'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'
import setupCron from './util/cron'
import setupAuthentication from './util/oidc'
import { redisStore } from './util/redis'

const app = express()

app.use(
  session({
    store: redisStore,
    resave: false,
    saveUninitialized: false,
    secret: inCI ? 'testing' : SESSION_SECRET,
  })
)

app.use(passport.initialize())
app.use(passport.session())

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

  await setupAuthentication()

  if (inProduction || inStaging) {
    await setupCron()
  }

  logger.info(`Server running on port ${PORT}`)
})
