import express from 'express'
import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, inProduction } from '../../../config'
import type { ChatMessage } from '../../../shared/llmTypes'
import { ChatInstance, Discussion, RagIndex, UserChatInstanceUsage } from '../../db/models'
import { calculateUsage, checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import { streamChat } from '../../services/langchain/chat'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import getEncoding from '../../util/tiktoken'
import { getAllowedModels, getModelContextLimit } from '../../util/util'
import { parseFileAndAddToLastMessage } from './fileParsing'
import { upload } from './multer'
import { PostStreamSchemaV3 } from './types'
import { StructuredTool } from '@langchain/core/tools'
import { getRagIndexSearchTool } from '../../services/rag/searchTool'
import { ChatEvent } from '../../../shared/chat'

const router = express.Router()

router.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = PostStreamSchemaV3.parse(JSON.parse(req.body.data))
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
  let optionsMessagesWithFile: ChatMessage[] | undefined = undefined

  try {
    if (req.file) {
      optionsMessagesWithFile = (await parseFileAndAddToLastMessage(options.chatMessages, req.file)) as ChatMessage[]
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    throw ApplicationError.BadRequest('Error parsing file')
  }

  options.chatMessages = optionsMessagesWithFile || options.chatMessages

  const encoding = getEncoding(options.model)
  let tokenCount = calculateUsage(options.chatMessages, encoding)
  encoding.free()

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

  const tools: StructuredTool[] = []

  // Check rag index
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

    if (!ragIndex) {
      logger.error('RagIndex not found', { ragIndexId })
      res.status(404).send('RagIndex not found')
      return
    }

    tools.push(getRagIndexSearchTool(ragIndex))
  }

  // Prepare for streaming response
  res.setHeader('content-type', 'text/event-stream')

  const result = await streamChat({
    user,
    chatMessages: options.chatMessages,
    systemMessage: options.systemMessage,
    model: options.model,
    tools,
    writeEvent: async (event: ChatEvent) => {
      await new Promise((resolve) => {
        const success = res.write(`${JSON.stringify(event)}\n`, (err) => {
          if (err) {
            logger.error('Streaming write error:', err.name)
          }
        })

        if (!success) {
          logger.info('res.write returned false, waiting for drain')
          res.once('drain', resolve)
        } else {
          process.nextTick(resolve)
        }
      })
    },
  })

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
