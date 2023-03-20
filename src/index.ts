import express from 'express'

import { RequestBody } from './types'
import { PORT } from './util/config'
import logger from './util/logger'
import accessLogger from './middleware/access'
import { connectToDatabase } from './db/connection'
import seed from './db/seeders'
import { createCompletion } from './util/openai'

const app = express()

app.use(express.json())

app.use(accessLogger)

app.get('/ping', (_, res) => res.send('pong'))

app.post('/chat', async (req, res) => {
  const { id, prompt } = req.body as RequestBody

  if (!id || !prompt) return res.status(400).send('Missing id or prompt')

  const response = await createCompletion(prompt)
  const message = response?.choices[0]?.message?.content

  if (!message) return res.status(424).send('OpenAI API error')

  return res.send(message)
})

app.listen(PORT, async () => {
  await connectToDatabase()
  await seed()

  logger.info(`Server running on port ${PORT}`)
})
