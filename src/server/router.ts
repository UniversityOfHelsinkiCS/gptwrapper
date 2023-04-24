import express from 'express'
import cors from 'cors'

import { inProduction } from '../config'
import { ChatRequest } from './types'
import shibbolethMiddleware from './middleware/shibboleth'
import userMiddleware from './middleware/user'
import accessLogger from './middleware/access'
import { Service } from './db/models'
import { isError } from './util/parser'
import { calculateUsage, checkUsage, incrementUsage } from './services/usage'
import hashData from './util/hash'
import { createCompletion, completionStream } from './util/openai'
import getEncoding from './util/tiktoken'
import logger from './util/logger'

const router = express()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => res.send('pong'))

router.post('/chat', async (req, res) => {
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

// eslint-disable-next-line consistent-return
router.post('/stream', async (req, res) => {
  const request = req as ChatRequest
  const { id, options } = request.body
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')
  if (!id) return res.status(400).send('Missing id')
  if (!options) return res.status(400).send('Missing options')

  const service = await Service.findByPk(id)
  if (!service) return res.status(404).send('Service not found')

  const usageAllowed = await checkUsage(user, service)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.user = hashData(user.id)
  const stream = await completionStream(options)

  if (isError(stream)) return res.status(424).send(stream)

  const encoding = getEncoding(options.model)

  let tokenCount = calculateUsage(options, encoding)
  // https://github.com/openai/openai-node/issues/18#issuecomment-1493132878
  stream.on('data', (chunk: Buffer) => {
    // Messages in the event stream are separated by a pair of newline characters.
    const payloads = chunk.toString().split('\n\n')
    // eslint-disable-next-line no-restricted-syntax
    for (const payload of payloads) {
      if (payload.includes('[DONE]')) return
      if (payload.startsWith('data:')) {
        const data = payload.replaceAll(/(\n)?^data:\s*/g, '') // in case there's multiline data event
        try {
          const delta = JSON.parse(data.trim())
          const text = delta.choices[0].delta?.content

          if (!inProduction) logger.info(text)
          res.write(text)
          tokenCount += encoding.encode(text).length || 0
        } catch (error) {
          logger.error(`Error with JSON.parse and ${payload}.\n${error}`)
        }
      }
    }
  })

  stream.on('end', async () => {
    await incrementUsage(user, id, tokenCount)
    logger.info(`Stream ended. Total tokens: ${tokenCount}`)
    res.end()
  })
  stream.on('error', (e: Error) => {
    logger.error(e)
    res.end()
  })
})

export default router
