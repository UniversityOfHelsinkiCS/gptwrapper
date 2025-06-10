import express from 'express'
import multer from 'multer'

import { CourseChatRequest, RequestWithUser } from '../types'
import { isError } from '../util/parser'
import { calculateUsage, incrementUsage, checkUsage, checkCourseUsage, incrementCourseUsage } from '../services/chatInstances/usage'
import { getCompletionEvents, streamCompletion } from '../util/azure/client'
import { getMessageContext, getModelContextLimit, getCourseModel, getAllowedModels } from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'
import { inProduction, DEFAULT_TOKEN_LIMIT, FREE_MODEL } from '../../config'
import { pdfToText } from '../util/pdfToText'
import { Discussion, ChatInstance, RagIndex } from '../db/models'

import { ResponsesClient } from '../util/azure/ResponsesAPI'
import { z } from 'zod'
import { DEFAULT_RAG_SYSTEM_PROMPT } from '../util/config'

const openaiRouter = express.Router()

const storage = multer.memoryStorage()
const upload = multer({ storage })

const fileParsing = async (options: any, req: any) => {
  let fileContent = ''

  const textFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md']
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

const PostStreamSchemaV2 = z.object({
  options: z.object({
    model: z.string(),
    assistantInstructions: z.string().optional(),
    messages: z.array(z.any()),
    userConsent: z.boolean().optional(),
    modelTemperature: z.number().min(0).max(2).optional(),
    saveConsent: z.boolean().optional(),
    prevResponseId: z.string().optional(),
    courseId: z.string().optional(),
    ragIndexId: z.number().optional(),
  }),
  courseId: z.string().optional(),
})

openaiRouter.post('/stream/v2', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = PostStreamSchemaV2.parse(JSON.parse(req.body.data))
  const { userConsent, ragIndexId } = options
  const { user } = req

  console.log('options', options)

  if (!user.id) {
    res.status(401).send('Unauthorized')
    return
  }

  const course =
    courseId &&
    (await ChatInstance.findOne({
      where: { courseId },
    }))

  if (courseId && !course) {
    res.status(404).send('Course not found')
    return
  }

  // Check if the user has usage limits for the course or model
  let usageAllowed = false
  if (courseId) {
    usageAllowed = await checkCourseUsage(user, courseId)
  } else if (options.model === FREE_MODEL) {
    usageAllowed = true
  } else {
    usageAllowed = await checkUsage(user, options.model)
  }

  if (!usageAllowed) {
    res.status(403).send('Usage limit reached')
    return
  }

  // Check if the model is allowed for the course
  if (courseId) {
    const courseModel = await getCourseModel(courseId)

    if (options.model) {
      const allowedModels = getAllowedModels(courseModel)
      if (!allowedModels.includes(options.model)) {
        res.status(403).send('Model not allowed')
        return
      }
    } else {
      options.model = courseModel
    }
  }

  // Check file
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

  options.messages = getMessageContext(optionsMessagesWithFile || options.messages)

  const encoding = getEncoding(options.model)
  let tokenCount = calculateUsage(options as any, encoding)
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  if (options.model !== FREE_MODEL && tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT && !userConsent) {
    res.status(201).json({
      tokenConsumtionWarning: true,
      message: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
    })
    return
  }

  // Check context limit
  const contextLimit = getModelContextLimit(options.model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    res.status(403).send('Model maximum context reached')
    return
  }

  // Check rag index
  let vectorStoreId: string | undefined = undefined
  let instructions: string | undefined = options.assistantInstructions

  if (ragIndexId && user.isAdmin) {
    const ragIndex = await RagIndex.findByPk(ragIndexId)
    if (ragIndex) {
      if (courseId && ragIndex.courseId !== courseId) {
        logger.error('RagIndex does not belong to the course', {
          ragIndexId,
          courseId,
        })
        res.status(403).send('RagIndex does not belong to the course')
        return
      }

      vectorStoreId = ragIndex.metadata.azureVectorStoreId
      instructions = `${instructions} ${ragIndex.metadata.instructions ?? DEFAULT_RAG_SYSTEM_PROMPT}`

      console.log('using', ragIndex.toJSON())
    } else {
      logger.error('RagIndex not found', { ragIndexId })
      res.status(404).send('RagIndex not found')
      return
    }
  }

  const responsesClient = new ResponsesClient({
    model: options.model,
    courseId,
    vectorStoreId,
    instructions,
    temperature: options.modelTemperature,
  })

  const latestMessage = options.messages[options.messages.length - 1]

  const events = await responsesClient.createResponse({
    input: [latestMessage],
    prevResponseId: options.prevResponseId,
    include: ragIndexId ? ['file_search_call.results'] : [],
  })

  if (isError(events)) {
    res.status(424)
    return
  }

  res.setHeader('content-type', 'text/event-stream')

  const result = await responsesClient.handleResponse({
    events,
    encoding,
    res,
  })

  tokenCount += result.tokenCount

  let userToCharge = user
  if (inProduction && req.hijackedBy) {
    userToCharge = req.hijackedBy
  }

  if (courseId) {
    await incrementCourseUsage(userToCharge, courseId, tokenCount)
  } else if (options.model !== FREE_MODEL) {
    await incrementUsage(userToCharge, tokenCount)
  }

  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model: options.model,
    user: user.username,
    courseId,
  })

  const consentToSave = courseId && course.saveDiscussions && options.saveConsent

  console.log('consentToSave', options.saveConsent, user.username)

  if (consentToSave) {
    // @todo: should file search results also be saved?
    const discussion = {
      userId: user.id,
      courseId,
      response: result.response,
      metadata: options,
    }
    await Discussion.create(discussion)
  }

  encoding.free()

  res.end()
  return
})

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

  const usageAllowed = courseId ? await checkCourseUsage(user, courseId) : model === FREE_MODEL || (await checkUsage(user, model))

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

  options.messages = getMessageContext(optionsMessagesWithFile || options.messages)
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  if (model !== FREE_MODEL && tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT && !userConsent) {
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

  const events = await getCompletionEvents(options)

  if (isError(events)) {
    res.status(424)
    return
  }

  res.setHeader('content-type', 'text/event-stream')

  const completion = await streamCompletion(events, options, encoding, res)

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

  const consentToSave = courseId && course.saveDiscussions && options.saveConsent

  console.log('consentToSave', options.saveConsent, user.username)

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

openaiRouter.post('/stream/:courseId/:version?', upload.single('file'), async (r, res) => {
  const { courseId, version } = r.params
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

  const responsesClient = new ResponsesClient({
    model: options.model,
    courseId,
    instructions: options.assistantInstructions,
    temperature: options.modelTemperature,
  })

  let events
  if (version === 'v2') {
    const latestMessage = options.messages[options.messages.length - 1] // Adhoc to input only the latest message
    events = await responsesClient.createResponse({
      input: [latestMessage],
      prevResponseId: options.prevResponseId,
    })
  } else {
    events = await getCompletionEvents(options)
  }

  if (isError(events)) {
    res.status(424).send(events)
    return
  }

  res.setHeader('content-type', 'text/event-stream')

  let completion
  if (version === 'v2') {
    completion = await responsesClient.handleResponse({
      events,
      encoding,
      res,
    })
  } else {
    completion = await streamCompletion(events, options, encoding, res)
  }

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
})

export default openaiRouter
