import express from 'express'
import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, inProduction } from '../../../config'
import { ChatInstance, Discussion, RagIndex, UserChatInstanceUsage } from '../../db/models'
import { calculateUsage, checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import { ResponsesClient } from '../../util/azure/ResponsesAPI'
import { DEFAULT_RAG_SYSTEM_PROMPT } from '../../util/config'
import logger from '../../util/logger'
import getEncoding from '../../util/tiktoken'
import { getAllowedModels, getMessageContext, getModelContextLimit } from '../../util/util'
import { parseFileAndAddToLastMessage } from './fileParsing'
import { upload } from './multer'
import { type MessageType, PostStreamSchemaV2 } from './types'

/**
 * @deprecated Uses the Responses API, which is unreliably implemented in azure. Keep v2 for reference until v3 reaches feature parity (sort of).
 */
const router = express.Router()

router.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = PostStreamSchemaV2.parse(JSON.parse(req.body.data))
  const { model, ragIndexId } = options
  const { user } = req

  // @todo were not checking if the user is enrolled?
  let course: ChatInstance | null = null

  if (courseId) {
    course = await ChatInstance.findOne({
      where: { courseId },
    })
    if (!course) {
      throw ApplicationError.NotFound('Course not found')
    }

    const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
      where: {
        userId: user.id,
        chatInstanceId: course.id,
      },
    })
    course.currentUserUsage = chatInstanceUsage
  }

  const isFreeModel = model === FREE_MODEL

  const usageAllowed = (course ? checkCourseUsage(user, course) : isFreeModel) || checkUsage(user, model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  // Check if the model is allowed for the course
  if (course) {
    const courseModel = course.model

    if (options.model) {
      const allowedModels = getAllowedModels(courseModel)
      if (!allowedModels.includes(options.model)) {
        throw ApplicationError.Forbidden('Model not allowed')
      }
    } else {
      options.model = courseModel
    }
  }

  // Check file
  let optionsMessagesWithFile: MessageType[] | undefined = undefined

  try {
    if (req.file) {
      optionsMessagesWithFile = await parseFileAndAddToLastMessage(options.messages, req.file)
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    throw ApplicationError.BadRequest('Error parsing file')
  }

  options.messages = getMessageContext(optionsMessagesWithFile || options.messages)

  const encoding = getEncoding(options.model)
  let tokenCount = calculateUsage(options.messages, encoding)
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  if (!isFreeModel && tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT) {
    res.status(201).json({
      tokenConsumtionWarning: true,
      message: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
    })
    return
  }

  // Check context limit
  const contextLimit = getModelContextLimit(options.model)

  if (tokenCount > contextLimit) {
    throw ApplicationError.BadRequest('Model maximum context reached')
  }

  // Check rag index
  let instructions: string | undefined = options.assistantInstructions
  let ragIndex: RagIndex | undefined

  if (ragIndexId) {
    if (!courseId && !user.isAdmin) {
      throw ApplicationError.Forbidden('User is not admin and trying to access non-course rag')
    }

    ragIndex =
      (await RagIndex.findByPk(ragIndexId, {
        include: {
          model: ChatInstance,
          as: 'chatInstances',
          where: courseId ? { courseId } : {},
        },
      })) ?? undefined
    if (ragIndex) {
      instructions = `${instructions} ${ragIndex.metadata.instructions ?? DEFAULT_RAG_SYSTEM_PROMPT}`
    }
    if (!ragIndex) {
      logger.error('RagIndex not found', { ragIndexId })
      res.status(404).send('RagIndex not found')
      return
    }
  }

  const responsesClient = new ResponsesClient({
    model: options.model,
    ragIndex,
    instructions,
    temperature: options.modelTemperature,
    user,
  })

  // Using the responses API, we only send the last message and the id to previous message
  const latestMessage = options.messages[options.messages.length - 1]

  const stream = await responsesClient.createResponse({
    input: latestMessage,
    prevResponseId: options.prevResponseId,
    include: ragIndexId ? ['file_search_call.results'] : [],
  })

  // Prepare for streaming response
  res.setHeader('content-type', 'text/event-stream')

  const result = await responsesClient.handleResponse({
    stream,
    encoding,
    res,
  })

  encoding.free()

  tokenCount += result.tokenCount

  // Increment user usage if not using free model
  // If the user is hijacked by admin in production, charge the admin instead
  if (!isFreeModel) {
    let userToCharge = user
    if (inProduction && req.hijackedBy) {
      userToCharge = req.hijackedBy
    }

    if (course) {
      await incrementCourseUsage(course, tokenCount) // course.currentUserUsage.usage is incremented by tokenCount
    } else {
      await incrementUsage(userToCharge, tokenCount)
    }
  }

  const chatCompletionMeta = {
    tokenCount,
    model: options.model,
    user: user.username,
    courseId,
    course: course?.name?.fi,
    ragIndexId: ragIndex?.id,
    fileSize: req.file?.size,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
  }

  logger.info(`Stream ended. Total tokens: ${tokenCount}`, chatCompletionMeta)

  res.locals.chatCompletionMeta = chatCompletionMeta

  // If course has saveDiscussion turned on and user has consented to saving the discussion, save the discussion
  const consentToSave = courseId && course?.saveDiscussions && options.saveConsent

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

  res.end()
  return
})

export default router
