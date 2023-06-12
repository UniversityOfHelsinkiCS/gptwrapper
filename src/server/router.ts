import express from 'express'
import cors from 'cors'

import { inProduction } from '../config'
import { tikeIam } from './util/config'
import { ChatRequest } from './types'
import shibbolethMiddleware from './middleware/shibboleth'
import userMiddleware from './middleware/user'
import accessLogger from './middleware/access'
import { Service } from './db/models'
import { isError } from './util/parser'
import { calculateUsage, incrementUsage, checkUsage } from './services/usage'
import hashData from './util/hash'
import { completionStream } from './util/openai'
import { getMessageContext } from './util/util'
import getEncoding from './util/tiktoken'
import checkAccess from './services/access'
import sendEmail from './util/pate'
import logger from './util/logger'

const router = express()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => res.send('pong'))

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
  options.messages = getMessageContext(options.messages)

  const encoding = getEncoding(options.model)
  let tokenCount = calculateUsage(options, encoding)

  // gpt-3.5-turbo has maximum context of 4096 tokens
  if (tokenCount > 4000)
    return res.status(403).send('Model maximum context reached')

  const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  const stream = await completionStream(options, isTike)

  if (isError(stream)) return res.status(424).send(stream)

  res.setHeader('content-type', 'text/plain')

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
          // eslint-disable-next-line no-console
          console.error(`Error with JSON.parse and ${payload}.\n${error}`)
        }
      }
    }
  })

  stream.on('end', async () => {
    await incrementUsage(user, id, tokenCount)
    logger.info(`Stream ended. Total tokens: ${tokenCount}`, { tokenCount })
    res.end()
  })
  stream.on('error', (e: Error) => {
    logger.error(e)
    res.end()
  })
})

router.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.send({})
  if (!isAdmin && !checkAccess(iamGroups)) return res.send({})

  return res.send(user)
})

router.post('/email', async (req, res) => {
  const { to, text, subject } = req.body

  const response = await sendEmail([to], text, subject)

  return res.send(response)
})

export default router
