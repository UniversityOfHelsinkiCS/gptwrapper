/* eslint-disable no-restricted-syntax */
import express from 'express'

import { inProduction } from '../../config'
import { tikeIam } from '../util/config'
import { ChatRequest, CourseChatRequest, AzureOptions } from '../types'
import { isError } from '../util/parser'
import {
  calculateUsage,
  incrementUsage,
  checkUsage,
  checkCourseUsage,
  incrementCourseUsage,
} from '../services/usage'
import { completionStream } from '../util/openai'
import { getCompletionEvents, streamCompletion } from '../util/azure'
import { getMessageContext, getModelContextLimit } from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'

const openaiRouter = express.Router()

openaiRouter.post('/stream', async (r, res) => {
  const req = r as ChatRequest
  const { options } = req.body
  const { model } = options
  const { user } = req

  if (!user.id) return res.status(401).send('Unauthorized')

  if (!checkUsage(user)) return res.status(403).send('Usage limit reached')

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

  if (isTike) {
    const stream = await completionStream(options)

    if (isError(stream)) return res.status(424).send(stream)

    res.setHeader('content-type', 'text/event-stream')

    for await (const part of stream) {
      try {
        const text = part.choices[0].delta?.content

        if (!inProduction) logger.info(text)

        if (text) {
          res.write(text)
          tokenCount += encoding.encode(text).length || 0
        }
      } catch (error) {
        logger.error(error)
      }
    }
  } else {
    const events = await getCompletionEvents(options as AzureOptions)

    if (isError(events)) return res.status(424).send(events)

    res.setHeader('content-type', 'text/event-stream')

    tokenCount += await streamCompletion(
      events,
      options as AzureOptions,
      encoding,
      res
    )
  }

  await incrementUsage(user, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

openaiRouter.post('/stream/:courseId', async (r, res) => {
  const { courseId } = r.params
  const req = r as CourseChatRequest
  const { options } = req.body
  const { model } = options
  const { user } = req

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = checkCourseUsage(user, courseId)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.messages = getMessageContext(options.messages)
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  // Downgrade to gpt-3.5 for long student conversations
  if (courseId && model === 'gpt-4' && tokenCount > 2_000) {
    options.model = 'gpt-3.5-turbo'
    tokenCount = Math.round(tokenCount / 10)
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424).send(events)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  await incrementCourseUsage(user, courseId, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    courseId,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

export default openaiRouter
