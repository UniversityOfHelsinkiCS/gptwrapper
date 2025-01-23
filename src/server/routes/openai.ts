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
import { inProduction, DEFAULT_TOKEN_LIMIT, FREE_MODEL } from '../../config'
import { pdfToText } from '../util/pdfToText'
import { Discussion, ChatInstance } from '../db/models'

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

  options.messages = [...options.messages, updatedMessage]

  return options.messages
}

openaiRouter.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = JSON.parse(req.body.data)
  const { model, userConsent } = options
  const { user } = req

  options.options = { temperature: options.modelTemperature }

  if (!user.id) {
    res.status(401).send('Unauthorized')
    return
  }

  const usageAllowed = courseId
    ? await checkCourseUsage(user, courseId)
    : model === FREE_MODEL || (await checkUsage(user, model))

  if (!usageAllowed) {
    res.status(403).send('Usage limit reached')
    return
  }

  let optionsMessagesWithFile = null

  try {
    if (req.file) {
      optionsMessagesWithFile = await fileParsing(options, req)
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    res.status(400).send('Error parsing file')
    return
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

  if (
    model !== FREE_MODEL &&
    tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT &&
    !userConsent
  ) {
    res.status(201).json({
      tokenConsumtionWarning: true,
      message: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
    })
    return
  }

  const contextLimit = getModelContextLimit(model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    res.status(403).send('Model maximum context reached')
    return
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) {
    res.status(424)
    return
  }

  res.setHeader('content-type', 'text/event-stream')

  const completion = await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  tokenCount += completion.tokenCount

  let userToCharge = user
  if (inProduction && req.hijackedBy) {
    userToCharge = req.hijackedBy
  }

  if (courseId) {
    await incrementCourseUsage(userToCharge, courseId, tokenCount)
  } else if (model !== FREE_MODEL) {
    await incrementUsage(userToCharge, tokenCount)
  }

  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
    courseId,
  })

  const course =
    courseId &&
    (await ChatInstance.findOne({
      where: { courseId },
    }))

  const consentToSave =
    courseId && course.saveDiscussions && options.saveConsent

  // eslint-disable-next-line no-console
  console.log(
    'consentToSave',
    consentToSave,
    options.saveConsent,
    user.username
  )

  if (consentToSave) {
    const discussion = {
      userId: user.id,
      courseId,
      response: completion.response,
      metadata: options,
    }
    await Discussion.create(discussion)
  }

  encoding.free()

  res.end()
  return
})

openaiRouter.post(
  '/stream/:courseId',
  upload.single('file'),
  async (r, res) => {
    const { courseId } = r.params
    const req = r as CourseChatRequest
    const { options } = JSON.parse(r.body.data)
    const { user } = req

    if (!user.id) {
      res.status(401).send('Unauthorized')
      return
    }

    const usageAllowed = await checkCourseUsage(user, courseId)
    if (!usageAllowed) {
      res.status(403).send('Usage limit reached')
      return
    }

    options.messages = getMessageContext(options.messages)
    options.stream = true

    const model = await getCourseModel(courseId)

    if (options.model) {
      const allowedModels = getAllowedModels(model)
      if (!allowedModels.includes(options.model)) {
        res.status(403).send('Model not allowed')
        return
      }
    } else {
      options.model = model
    }

    const encoding = getEncoding(options.model)
    let tokenCount = calculateUsage(options, encoding)

    const contextLimit = getModelContextLimit(options.model)

    if (tokenCount > contextLimit) {
      logger.info('Maximum context reached')
      res.status(403).send('Model maximum context reached')
      return
    }

    const events = await getCompletionEvents(options as AzureOptions)

    if (isError(events)) {
      res.status(424).send(events)
      return
    }

    res.setHeader('content-type', 'text/event-stream')

    const completion = await streamCompletion(
      events,
      options as AzureOptions,
      encoding,
      res
    )

    tokenCount += completion.tokenCount

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

    res.end()
    return
  }
)

export default openaiRouter
