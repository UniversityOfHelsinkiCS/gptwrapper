import express from 'express'
import cors from 'cors'

import { ChatRequest } from './types'
import { PORT, inProduction } from './util/config'
import logger from './util/logger'
import shibbolethMiddleware from './middleware/shibboleth'
import userMiddleware from './middleware/user'
import accessLogger from './middleware/access'
import { connectToDatabase } from './db/connection'
import { Service } from './db/models'
import seed from './db/seeders'
import { isError } from './util/parser'
import { checkUsage, incrementUsage } from './services/usage'
import hashData from './util/hash'
import { createCompletion } from './util/openai'

const app = express()

app.use(cors())
app.use(express.json())

app.use(shibbolethMiddleware)
app.use(userMiddleware)

app.use(accessLogger)

app.get('/ping', (_, res) => res.send('pong'))

app.post('/v0/chat', async (req, res) => {
  const request = req as ChatRequest
  const { id, options } = request.body
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')
  if (!id) return res.status(400).send('Missing id')
  if (!options) return res.status(400).send('Missing options')
  if (options.stream) return res.status(406).send('Stream not supported')

  const service = await Service.findByPk(id)
  if (!service) return res.status(404).send('Service not found')

  const usageAllowed = await checkUsage(user, service)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.user = hashData(user.id)
  const response = await createCompletion(options)

  if (isError(response)) return res.status(424).send(response)

  const tokenCount = response.usage?.total_tokens || 0
  await incrementUsage(user, id, tokenCount)

  return res.send(response)
})

app.listen(PORT, async () => {
  await connectToDatabase()
  if (!inProduction) await seed()

  logger.info(`Server running on port ${PORT}`)
})
