import express from 'express'
import multer from 'multer'

import { CourseChatRequest, AzureOptions, RequestWithUser } from '../types'
import { isError } from '../util/parser'
import {
  calculateUsage,
  incrementUsage,
  checkUsage,
  checkCourseUsage,
  incrementCourseUsage,
} from '../chatInstances/usage'
import { getCompletionEvents, streamCompletion } from '../util/azure'
import {
  getMessageContext,
  getModelContextLimit,
  getCourseModel,
  getAllowedModels,
} from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'
import { inProduction, DEFAULT_TOKEN_LIMIT } from '../../config'
import { pdfToText } from '../util/pdfToText'

const openaiRouter = express.Router()

const storage = multer.memoryStorage()
const upload = multer({ storage })

const fileParsing = async (options: any, req: any) => {
  let fileContent = ''

  const textFileTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/csv',
    'text/markdown',
    'text/md',
  ]
  if (textFileTypes.includes(req.file.mimetype)) {
    const fileBuffer = req.file.buffer
    fileContent = fileBuffer.toString('utf8')
  }

  if (req.file.mimetype === 'application/pdf') {
    fileContent = await pdfToText(req.file.buffer)
  }

  const allMessages = options.messages

  const updatedMessage = {
    ...allMessages[allMessages.length - 1],
    content: `${allMessages[allMessages.length - 1].content} ${fileContent}`,
  }
  options.messages.pop()
  // eslint-disable-next-line no-param-reassign
  options.messages = [...options.messages, updatedMessage]

  return options.messages
}

openaiRouter.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = JSON.parse(req.body.data)
  const { model, userConsent } = options
  const { user } = req

  options.options = { temperature: options.modelTemperature }

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = courseId
    ? await checkCourseUsage(user, courseId)
    : await checkUsage(user, model)

  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  let optionsMessagesWithFile = null

  try {
    if (req.file) {
      optionsMessagesWithFile = await fileParsing(options, req)
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    return res.status(400).send('Error parsing file')
  }

  options.messages = getMessageContext(
    optionsMessagesWithFile || options.messages
  )
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)
  const tokenUsagePercentage = Math.round(
    (tokenCount / DEFAULT_TOKEN_LIMIT) * 100
  )

  if (tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT && !userConsent) {
    return res.status(201).json({
      tokenConsumtionWarning: true,
      message: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
    })
  }

  const contextLimit = getModelContextLimit(model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  let userToCharge = user
  if (inProduction && req.hijackedBy) {
    userToCharge = req.hijackedBy
  }

  if (courseId) {
    await incrementCourseUsage(userToCharge, courseId, tokenCount)
  } else if (model === 'gpt-4') {
    await incrementUsage(userToCharge, tokenCount)
  }

  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
    courseId,
  })

  encoding.free()

  return res.end()
})

openaiRouter.post(
  '/stream/:courseId',
  upload.single('file'),
  async (r, res) => {
    const { courseId } = r.params
    const req = r as CourseChatRequest
    const { options } = JSON.parse(r.body.data)
    const { user } = req

    if (!user.id) return res.status(401).send('Unauthorized')

    const usageAllowed = await checkCourseUsage(user, courseId)
    if (!usageAllowed) return res.status(403).send('Usage limit reached')

    options.messages = getMessageContext(options.messages)
    options.stream = true

    const model = await getCourseModel(courseId)

    if (options.model) {
      const allowedModels = getAllowedModels(model)
      if (!allowedModels.includes(options.model))
        return res.status(403).send('Model not allowed')
    } else {
      options.model = model
    }

    const encoding = getEncoding(options.model)
    let tokenCount = calculateUsage(options, encoding)

    const contextLimit = getModelContextLimit(options.model)

    console.log({
      model,
      tokenCount,
      contextLimit,
    })

    if (tokenCount > contextLimit) {
      logger.info('Maximum context reached')
      return res.status(403).send('Model maximum context reached')
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

    let userToCharge = user
    if (inProduction && req.hijackedBy) {
      userToCharge = req.hijackedBy
    }

    await incrementCourseUsage(userToCharge, courseId, tokenCount)
    logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
      tokenCount,
      courseId,
      model: options.model,
      user: user.username,
    })

    encoding.free()

    return res.end()
  }
)

export default openaiRouter
