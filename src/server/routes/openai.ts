import express from 'express'
import multer from 'multer'
import { z } from 'zod/v4'
import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, inProduction } from '../../config'
import { ChatInstance, Discussion, RagIndex } from '../db/models'
import { calculateUsage, checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../services/chatInstances/usage'
import type { RequestWithUser } from '../types'
import { getCompletionEvents, streamCompletion } from '../util/azure/client'
import { FileSearchResultsStore } from '../util/azure/fileSearchResultsStore'
import { ResponsesClient } from '../util/azure/ResponsesAPI'
import { DEFAULT_RAG_SYSTEM_PROMPT } from '../util/config'
import logger from '../util/logger'
import { isError } from '../util/parser'
import { pdfToText } from '../util/pdfToText'
import getEncoding from '../util/tiktoken'
import { getAllowedModels, getCourseModel, getMessageContext, getModelContextLimit } from '../util/util'

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
    modelTemperature: z.number().min(0).max(2),
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

  if (!user.id) {
    res.status(401).send('Unauthorized')
    return
  }

  // @todo were not checking if the user is enrolled?
  let course: ChatInstance | null = null

  if (courseId) {
    const found = await ChatInstance.findOne({
      where: { courseId },
    })
    course = found ?? null
  }

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
  let tokenCount = options.model === 'mock' ? 0 : calculateUsage(options as any, encoding)
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
  let vectorStoreId: string | undefined
  let instructions: string | undefined = options.assistantInstructions

  if (ragIndexId) {
    if (!courseId && !user.isAdmin) {
      logger.error('User is not admin and trying to access non-course rag')
      res.status(403).send('Forbidden')
      return
    }

    const ragIndex = await RagIndex.findByPk(ragIndexId, {
      include: {
        model: ChatInstance,
        as: 'chatInstances',
        where: courseId ? { courseId } : {},
      },
    })
    if (ragIndex) {
      vectorStoreId = ragIndex.metadata.azureVectorStoreId
      instructions = `${instructions} ${ragIndex.metadata.instructions ?? DEFAULT_RAG_SYSTEM_PROMPT}`
    } else {
      logger.error('RagIndex not found', { ragIndexId })
      res.status(404).send('RagIndex not found')
      return
    }
  }

  const responsesClient = new ResponsesClient({
    model: options.model,
    vectorStoreId,
    instructions,
    temperature: options.modelTemperature,
    user,
  })

  // TODO: when we get rid of CCV1, we might want to start sending only the last message to this endpoint
  // take into account how the tokens are calculated based in all the messages send into this endpoint
  const latestMessage = options.messages[options.messages.length - 1]

  const events = await responsesClient.createResponse({
    input: latestMessage,
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
    ragIndexId,
  })

  tokenCount += options.model === 'mock' ? 0 : result.tokenCount

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

  const consentToSave = courseId && course!.saveDiscussions && options.saveConsent

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

openaiRouter.get('/fileSearchResults/:fileSearchId', async (req, res) => {
  const { fileSearchId } = req.params
  const { user } = req as unknown as RequestWithUser

  if (!user.id) {
    res.status(401).send('Unauthorized')
    return
  }

  const results = await FileSearchResultsStore.getResults(fileSearchId, user)

  if (!results) {
    res.status(404).send('File search results not found')
    return
  }

  res.json(results)
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

export default openaiRouter
