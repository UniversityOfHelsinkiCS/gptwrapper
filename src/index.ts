import express from 'express'

import { PORT } from './util/config.js'
import logger from './util/logger.js'
import { createCompletion } from './util/openai.js'

const app = express()

app.use(express.json())

app.get('/ping', (_, res) => res.send('pong'))

app.post('/chat', async (req, res) => {
  const { prompt } = req.body

  if (!prompt) return res.status(400).send('Missing prompt')

  const response = await createCompletion(prompt)
  const message = response?.choices[0]?.message?.content

  if (!message) return res.status(500).send('OpenAI API error')

  return res.send(message)
})

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
