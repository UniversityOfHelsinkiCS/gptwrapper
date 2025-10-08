import type { StructuredTool } from '@langchain/core/tools'
import express from 'express'
import { DEFAUL_CONTEXT_LIMIT, DEFAULT_TOKEN_LIMIT, FREE_MODEL, inProduction, validModels } from '../../../config'
import { PostStreamSchemaV3, type ChatEvent, type ChatMessage } from '../../../shared/chat'
import { ChatInstance, Discussion, Enrolment, Prompt, RagIndex, Responsibility, UserChatInstanceUsage } from '../../db/models'
import { calculateUsage, checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import { streamChat } from '../../services/langchain/chat'
import { getMockRagIndexSearchTool } from '../../services/rag/mockSearchTool'
import { getRagIndexSearchTool } from '../../services/rag/searchTool'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import getEncoding from '../../util/tiktoken'
import { parseFileAndAddToLastMessage } from './fileParsing'
import { upload } from './multer'
import { checkIamAccess } from 'src/server/util/iams'
import { getOwnCourses } from 'src/server/services/chatInstances/access'
import { AiApiWarning } from '@shared/aiApi'

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
    if (!user.isAdmin && !checkIamAccess(user.iamGroups) && !(await getOwnCourses(user)).length) {
      throw ApplicationError.Forbidden('Not authorized for general chat')
    }
  }

  const isFreeModel = generationInfo.model === FREE_MODEL

  const usageAllowed = (course ? checkCourseUsage(user, course) : isFreeModel) || checkUsage(user, generationInfo.model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  // Check file
  let optionsMessagesWithFile: ChatMessage[] | undefined

  try {
    if (req.file) {
      optionsMessagesWithFile = (await parseFileAndAddToLastMessage(options.chatMessages, req.file)) as ChatMessage[]
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    throw ApplicationError.BadRequest('Error parsing file')
  }

  options.chatMessages = optionsMessagesWithFile || options.chatMessages

  const encoding = getEncoding(generationInfo.model)
  let tokenCount = calculateUsage(options.chatMessages, encoding)
  encoding.free()
  res.locals.chatCompletionMeta.inputTokenCount = tokenCount

  const warnings: AiApiWarning[] = []

  // Warn about usage if over 10% of limit
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  console.log(options.ignoredWarnings)

  if (!isFreeModel && tokenUsagePercentage > 10 && !options.ignoredWarnings?.includes('usage')) {
    res.locals.chatCompletionMeta.warning = 'usage'
    warnings.push({
      warningType: 'usage',
      warning: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
      canIgnore: true,
    })
  }

  // Check context limit
  const contextLimit = validModels.find((m) => m.name === generationInfo.model)?.context || DEFAUL_CONTEXT_LIMIT

  if (tokenCount > contextLimit && !options.ignoredWarnings?.includes('contextLimit')) {
    res.locals.chatCompletionMeta.warning = 'contextLimit'
    warnings.push({
      warningType: 'contextLimit',
      warning: `The messages you have sent exceed the context limit of ${contextLimit} tokens for the selected model. Your messages have ${tokenCount} tokens. Clicking continue will truncate the oldest messages.`,
      contextLimit,
      tokenCount,
      canIgnore: true,
    })
  }

  if (warnings.length > 0) {
    console.log('Warnings:', warnings)
    res.status(201).json({
      warnings,
    })
    return
  }

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

  res.locals.chatCompletionMeta.tools = tools.map((t) => t.name)

  // Prepare for streaming response
  res.setHeader('content-type', 'text/event-stream')

  const result = await streamChat({
    user,
    chatMessages: options.chatMessages,
    systemMessage,
    promptMessages: prompt?.messages,
    model: prompt?.model ?? generationInfo.model,
    temperature: prompt?.temperature ?? generationInfo.temperature ?? undefined,
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

  Object.assign(res.locals.chatCompletionMeta, {
    tokenCount,
    outputTokenCount: result.tokenCount,
    inputTokenCount: result.inputTokenCount,
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
