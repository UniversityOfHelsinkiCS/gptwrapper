import type { StructuredTool } from '@langchain/core/tools'
import express from 'express'
import { FREE_MODEL, inProduction } from '../../../config'
import { PostStreamSchemaV3, type ChatEvent, type ChatMessage } from '../../../shared/chat'
import { ChatInstance, Discussion, Enrolment, Prompt, RagIndex, Responsibility, UserChatInstanceUsage } from '../../db/models'
import { checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import { streamChat } from '../../services/langchain/chat'
import { getMockRagIndexSearchTool } from '../../services/rag/mockSearchTool'
import { getRagIndexSearchTool } from '../../services/rag/searchTool'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import { parseFileAndAddToLastMessage } from './fileParsing'
import { upload } from './multer'
import { checkIamAccess } from '../../util/iams'
import { getTeachedCourses } from '../../services/chatInstances/access'

const router = express.Router()

router.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = PostStreamSchemaV3.parse(JSON.parse(req.body.data))
  const { generationInfo } = options
  const { user } = req

  res.locals.chatCompletionMeta = {
    courseId,
    model: generationInfo.model,
    fileSize: req.file?.size,
  }

  // @todo were not checking if the user is enrolled?
  let course: ChatInstance | null = null

  // Find course
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

    // Authorize course user
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
  } else {
    // If using general chat, user must be a teacher on some course, have IAM access, or be admin
    if (!user.isAdmin && !checkIamAccess(user.iamGroups) && !(await getTeachedCourses(user)).length) {
      throw ApplicationError.Forbidden('Not authorized for general chat')
    }
  }

  // Add file to last message if exists
  try {
    if (req.file) {
      options.chatMessages = (await parseFileAndAddToLastMessage(options.chatMessages, req.file)) as ChatMessage[]
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    throw ApplicationError.BadRequest('Error parsing file')
  }

  // Model and temperature might be overridden by prompt settings
  let model = generationInfo.model
  let temperature = generationInfo.temperature

  // Find prompt if using a saved prompt
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

    if (prompt.model) {
      model = prompt.model
    }

    if (prompt.temperature) {
      temperature = prompt.temperature
    }

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

  const isFreeModel = model === FREE_MODEL

  const usageAllowed = (course ? checkCourseUsage(user, course) : isFreeModel) || checkUsage(user, generationInfo.model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  res.locals.chatCompletionMeta.tools = tools.map((t) => t.name)

  // Prepare for streaming response
  res.setHeader('content-type', 'text/event-stream')

  const result = await streamChat({
    user,
    chatMessages: options.chatMessages,
    systemMessage,
    promptMessages: prompt?.messages,
    model,
    temperature: temperature ?? undefined,
    ignoredWarnings: options.ignoredWarnings,
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

    if (course) {
      await incrementCourseUsage(course, result.tokenCount) // course.currentUserUsage.usage is incremented by tokenCount
    } else {
      await incrementUsage(userToCharge, result.tokenCount)
    }
  }

  Object.assign(res.locals.chatCompletionMeta, {
    tokenCount: result.tokenCount,
    outputTokenCount: result.tokenCount,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
    toolCalls: result.toolCalls,
  })

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
