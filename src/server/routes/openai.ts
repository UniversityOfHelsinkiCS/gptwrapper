import express from 'express'
import multer from 'multer'

// import { tikeIam } from '../util/config'
import { CourseChatRequest, AzureOptions, RequestWithUser } from '../types'
import { isError } from '../util/parser'
import {
  calculateUsage,
  incrementUsage,
  checkUsage,
  checkCourseUsage,
  incrementCourseUsage,
} from '../chatInstances/usage'
// import { completionStream, handleTike } from '../util/openai'
import { getCompletionEvents, streamCompletion } from '../util/azure'
import {
  getMessageContext,
  getModelContextLimit,
  getCourseModel,
  getAllowedModels,
} from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'

const openaiRouter = express.Router()

const storage = multer.memoryStorage()
const upload = multer({ storage })

const fileParsing = async (options: any, req: any) => {
  const fileBuffer = req.file.buffer
  let fileContent = ''
  if (req.file.mimetype === 'text/plain') {
    fileContent = fileBuffer.toString('utf8')
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

openaiRouter.post('/stream', upload.single('file'), async (req, res) => {
  const request = req as RequestWithUser
  const { options } = JSON.parse(req.body.options)
  const { model } = options
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkUsage(user, model)
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
  console.log('optionsMessage: ', optionsMessagesWithFile)
  options.messages = getMessageContext(
    optionsMessagesWithFile || options.messages
  )
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  // Tike API quota reached so this is disabled for now.
  // Ask JP for how it's going to be done in the future.
  /* const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  if (isTike) {
    const stream = await completionStream(options)

    if (isError(stream)) return res.status(424)

    res.setHeader('content-type', 'text/event-stream')

    tokenCount += await handleTike(stream, encoding, res)
  } else { */
  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )
  // }

  if (model === 'gpt-4') await incrementUsage(user, tokenCount)
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
    model: options.model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

export default openaiRouter
