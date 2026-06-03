import type { StructuredTool } from '@langchain/core/tools'
import express from 'express'
import { FREE_MODEL, inProduction, isMockModel, type ValidModelName } from '../../../config'
import { PostStreamSchemaV3, type ChatEvent } from '../../../shared/chat'
import { ChatInstance, Discussion, Enrolment, Prompt, PromptUsage, RagIndex, Responsibility, UserChatInstanceUsage } from '../../db/models'
import { checkCourseUsage, checkUsage, getUserTokenLimit, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import { streamChat } from '../../services/langchain/chat'
import { getMockRagIndexSearchTool } from '../../services/rag/mockSearchTool'
import { getRagIndexSearchTool } from '../../services/rag/searchTool'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import { upload } from './multer'

const router = express.Router()

const ensureModelAllowedForUser = (model: ValidModelName, isAdmin: boolean) => {
  if (inProduction && isMockModel(model) && !isAdmin) {
    throw ApplicationError.Forbidden('Mock model is restricted to admins in production')
  }
}

router.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = PostStreamSchemaV3.parse(JSON.parse(req.body.data))
  const { generationInfo } = options
  const { user } = req

  ensureModelAllowedForUser(generationInfo.model, user.isAdmin)

  res.locals.chatCompletionMeta = {
    courseId,
    model: generationInfo.model,
    fileSize: req.file?.size,
  }

  // @todo were not checking if the user is enrolled?
  let course: ChatInstance | null = null

  if (courseId) {
    course = await ChatInstance.findOne({
      where: { courseId },
      include: [
        { model: Enrolment, as: 'enrolments', where: { userId: user.id }, required: false },
        { model: Responsibility, as: 'responsibilities', where: { userId: user.id }, required: false },
      ],
    })
    if (!course) {
      throw ApplicationError.NotFound('Course not found')
    }

    if (!user.isAdmin && !course?.responsibilities?.length && !course?.enrolments?.length) {
      throw ApplicationError.Forbidden('Not authorized for this course')
    }

    const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
      where: {
        userId: user.id,
        chatInstanceId: course.id,
      },
    })
    course.currentUserUsage = chatInstanceUsage

    res.locals.chatCompletionMeta.course = course.name?.fi
  }
  // General chat is now open to all authenticated users

  // Validate file if exists (but don't parse - client already did that)
  res.setHeader('content-type', 'text/event-stream')
  res.setHeader('cache-control', 'no-cache')
  res.setHeader('connection', 'keep-alive')

  const writeEvent = async (event: ChatEvent) => {
    await new Promise<void>((resolve) => {
      const success = res.write(`${JSON.stringify(event)}\n`, (err) => {
        if (err) {
          logger.error('Streaming write error:', { error: err.name })
        }
      })

      if (!success) {
        logger.info('res.write returned false, waiting for drain')
        res.once('drain', resolve)
      } else {
        process.nextTick(resolve)
      }
    })
  }

  const model = generationInfo.model
  const temperature = generationInfo.temperature

  let prompt: Prompt | null = null

  let systemMessage = ''
  const tools: StructuredTool[] = []

  if (generationInfo.promptInfo.type === 'saved') {
    prompt = await Prompt.findByPk(generationInfo.promptInfo.id, {
      ...(course ? { where: { chatInstanceId: course.id } } : {}),
      include: [
        {
          model: RagIndex,
          as: 'ragIndex',
          required: false,
        },
      ],
    })

    if (!prompt) {
      throw ApplicationError.NotFound('Prompt not found')
    }

    systemMessage = prompt.systemMessage

    if (prompt.ragIndex) {
      const searchTool = generationInfo.model === 'mock' ? getMockRagIndexSearchTool(prompt.ragIndex) : getRagIndexSearchTool(prompt.ragIndex)
      tools.push(searchTool)

      res.locals.chatCompletionMeta.ragIndexId = prompt.ragIndex.id
      res.locals.chatCompletionMeta.ragIndex = prompt.ragIndex.metadata.name
    }

    res.locals.chatCompletionMeta.promptId = prompt.id
    res.locals.chatCompletionMeta.promptName = prompt.name
  } else {
    systemMessage = generationInfo.promptInfo.systemMessage
  }

  ensureModelAllowedForUser(model, user.isAdmin)

  const isFreeModel = model === FREE_MODEL

  const usageAllowed = (course ? checkCourseUsage(user, course) : isFreeModel) || checkUsage(user, generationInfo.model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  res.locals.chatCompletionMeta.tools = tools.map((t) => t.name)

  const result = await streamChat({
    user,
    chatMessages: options.chatMessages,
    systemMessage,
    promptMessages: prompt?.messages,
    model,
    temperature: temperature ?? undefined,
    ignoredWarnings: options.ignoredWarnings,
    tools,
    writeEvent,
    tokenLimit: getUserTokenLimit(user),
  })

  res.locals.chatCompletionMeta.inputTokenCount = result.inputTokenCount

  if ('warnings' in result) {
    res.locals.chatCompletionMeta.warnings = result.warnings.map((w) => w.warningType)
    // No stream after all.
    res.setHeader('content-type', 'application/json')
    res.status(201).json({
      warnings: result.warnings,
    })
    return
  }

  // Increment user usage if not using free model
  // If the user is hijacked by admin in production, charge the admin instead
  if (!isFreeModel) {
    let userToCharge = user
    if (inProduction && req.hijackedBy) {
      userToCharge = req.hijackedBy
    }

    const totalTokenCount = result.tokenCount + result.inputTokenCount
    if (course) {
      await incrementCourseUsage(course, totalTokenCount)
      await PromptUsage.create({
        chatInstanceId: course.id,
        promptId: prompt?.id ?? null,
        userId: userToCharge.id,
        tokenCount: totalTokenCount,
      })
    } else {
      await incrementUsage(userToCharge, totalTokenCount)
    }
  }

  Object.assign(res.locals.chatCompletionMeta, {
    tokenCount: result.tokenCount + result.inputTokenCount,
    outputTokenCount: result.tokenCount,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
    toolCalls: result.toolCalls,
  })

  // @todo: should file search results also be saved?
  if (courseId && course?.saveDiscussions) {
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
