import express from 'express'
import next from 'next'

import router from './router'
import { PORT, inDevelopment } from './util/config'
import logger from './util/logger'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'

const app = next({ dev: inDevelopment })
const handle = app.getRequestHandler()

const server = express()

server.use('/gptwrapper/api', (req, res, nxt) => router(req, res, nxt))
server.use('/gptwrapper/api', (_, res) => res.sendStatus(404))

const start = async () => {
  await app.prepare()

  server.get('*', (req, res) => handle(req, res))

  server.listen(PORT, async () => {
    await connectToDatabase()
    await seed()

    logger.info(`Server running on port ${PORT}`)
  })
}

start()
