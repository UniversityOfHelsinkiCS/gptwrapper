import express from 'express'

import { inProduction } from '../../config'
import { tikeIam } from '../util/config'
import { ChatRequest } from '../types'
import { Service } from '../db/models'
import { isError } from '../util/parser'
import { calculateUsage, incrementUsage, checkUsage } from '../services/usage'
import hashData from '../util/hash'
import { completionStream } from '../util/openai'
import { getMessageContext, getModel } from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'

const openaiRouter = express.Router()

// eslint-disable-next-line consistent-return
openaiRouter.post('/stream', async (req, res) => {
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
  options.model = await getModel(user.iamGroups)

  const encoding = getEncoding()
  let tokenCount = calculateUsage(options, encoding)

  // Model has maximum context of 16k tokens
  if (tokenCount > 16_000)
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

    encoding.free()
    res.end()
  })
  stream.on('error', (e: Error) => {
    logger.error(e)
    res.end()
  })
})

export default openaiRouter
