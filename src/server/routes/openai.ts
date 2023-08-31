import express from 'express'

import { inProduction } from '../../config'
import { tikeIam } from '../util/config'
import { ChatRequest } from '../types'
import { Service } from '../db/models'
import { isError } from '../util/parser'
import { calculateUsage, incrementUsage, checkUsage } from '../services/usage'
import hashData from '../util/hash'
import { completionStream } from '../util/openai'
import { getMessageContext, getModel, getModelContextLimit } from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'

const openaiRouter = express.Router()

openaiRouter.post('/stream', async (req, res) => {
  const request = req as ChatRequest
  const { id, options, courseId } = request.body
  const { user } = request

  if (courseId) logger.info(`Completion stream for ${courseId}`)

  if (!user.id) return res.status(401).send('Unauthorized')
  if (!id) return res.status(400).send('Missing id')
  if (!options) return res.status(400).send('Missing options')

  const service = await Service.findByPk(id)
  if (!service) return res.status(404).send('Service not found')

  const usageAllowed = await checkUsage(user, service, courseId)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.user = hashData(user.id)
  const model = await getModel(user.iamGroups, courseId)
  options.model = model
  options.messages = getMessageContext(options.messages)
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  const stream = await completionStream(options, isTike)

  if (isError(stream)) return res.status(424).send(stream)

  res.setHeader('content-type', 'text/plain')

  // eslint-disable-next-line no-restricted-syntax
  for await (const part of stream) {
    try {
      const text = part.choices[0].delta?.content

      if (!inProduction) logger.info(text)

      if (text) {
        res.write(text)
        tokenCount += encoding.encode(text).length || 0
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  await incrementUsage(user, id, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    courseId,
  })

  encoding.free()

  return res.end()
})

export default openaiRouter
