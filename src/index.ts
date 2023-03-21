import express from 'express'

import { ChatRequest } from './types'
import { PORT } from './util/config'
import logger from './util/logger'
import shibbolethMiddleware from './middleware/shibboleth'
import userMiddleware from './middleware/user'
import accessLogger from './middleware/access'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'
import { checkUsage, decrementUsage } from './services/usage'
import { createCompletion } from './util/openai'

const app = express()

app.use(express.json())

app.use(shibbolethMiddleware)
app.use(userMiddleware)

app.use(accessLogger)

app.get('/ping', (_, res) => res.send('pong'))

app.post('/chat', async (req, res) => {
  const request = req as ChatRequest
  const { id, prompt } = request.body
  const { user } = request

  if (!id || !prompt) return res.status(400).send('Missing id or prompt')

  const usageAllowed = await checkUsage(user, id)

  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  const response = await createCompletion(prompt)
  const message = response?.choices[0]?.message?.content

  if (!message) {
    decrementUsage(user, id)
    return res.status(424).send('OpenAI API error')
  }

  return res.send(message)
})

app.listen(PORT, async () => {
  await connectToDatabase()
  await seed()

  logger.info(`Server running on port ${PORT}`)
})
