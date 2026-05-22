import type { StructuredTool } from '@langchain/core/tools'
import express from 'express'
import { FREE_MODEL, inProduction, isMockModel, type ValidModelName } from '../../../config'
import { PostStreamSchemaV3, type ChatEvent } from '../../../shared/chat'
import { ChatInstance, Discussion, Enrolment, Prompt, PromptUsage, RagIndex, Responsibility, UserChatInstanceUsage } from '../../db/models'
import { checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import { streamAgentChat } from '../../services/langchain/agent'
import { getMockRagIndexSearchTool } from '../../services/rag/mockSearchTool'
import { getRagIndexSearchTool } from '../../services/rag/searchTool'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import { upload } from './multer'

const router = express.Router()

const v4DebugEnabled = process.env.V4_DEBUG === 'true'

const debugV4 = (message: string, data?: Record<string, unknown>) => {
  if (!v4DebugEnabled) {
    return
  }

  logger.debug(`[v4-route] ${message}`, data ?? {})
}

type StreamRequest = {
  req: RequestWithUser
  options: ReturnType<typeof PostStreamSchemaV3.parse>['options']
  courseId?: string
}

type PromptContext = {
  prompt: Prompt | null
  systemMessage: string
  tools: StructuredTool[]
}

const ensureModelAllowedForUser = (model: ValidModelName, isAdmin: boolean) => {
  if (inProduction && isMockModel(model) && !isAdmin) {
    throw ApplicationError.Forbidden('Mock model is restricted to admins in production')
  }
}

const parseStreamRequest = (request: express.Request): StreamRequest => {
  const req = request as RequestWithUser
  const { options, courseId } = PostStreamSchemaV3.parse(JSON.parse(req.body.data))

  return {
    req,
    options,
    courseId: courseId ?? undefined,
  }
}

const initializeResponseMeta = ({ res, courseId, model, fileSize }: { res: express.Response; courseId?: string; model: ValidModelName; fileSize?: number }) => {
  res.locals.chatCompletionMeta = {
    courseId,
    model,
    fileSize,
    routeVersion: 'v4',
  }
}

const resolveCourseContext = async ({
  req,
  res,
  courseId,
}: {
  req: RequestWithUser
  res: express.Response
  courseId?: string
}): Promise<ChatInstance | null> => {
  if (!courseId) {
    return null
  }

  const course = await ChatInstance.findOne({
    where: { courseId },
    include: [
      { model: Enrolment, as: 'enrolments', where: { userId: req.user.id }, required: false },
      { model: Responsibility, as: 'responsibilities', where: { userId: req.user.id }, required: false },
    ],
  })

  if (!course) {
    throw ApplicationError.NotFound('Course not found')
  }

  if (!req.user.isAdmin && !course.responsibilities?.length && !course.enrolments?.length) {
    throw ApplicationError.Forbidden('Not authorized for this course')
  }

  const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
    where: {
      userId: req.user.id,
      chatInstanceId: course.id,
    },
  })
  course.currentUserUsage = chatInstanceUsage

  res.locals.chatCompletionMeta.course = course.name?.fi

  return course
}

const configureStreamResponse = (res: express.Response) => {
  res.setHeader('content-type', 'text/event-stream')
  res.setHeader('cache-control', 'no-cache')
  res.setHeader('connection', 'keep-alive')
}

const createWriteEvent = (res: express.Response) => async (event: ChatEvent) => {
  debugV4('writing event to response', {
    type: event.type,
    textLength: event.type === 'writing' ? event.text.length : undefined,
    error: event.type === 'error' ? event.error : undefined,
    callId: event.type === 'toolCallStatus' ? event.callId : undefined,
  })

  await new Promise<void>((resolve) => {
    const success = res.write(`${JSON.stringify(event)}\n`, (err) => {
      if (err) {
        logger.error('Streaming write error:', { error: err.name })
      }
    })

    if (!success) {
      logger.info('res.write returned false, waiting for drain')
      res.once('drain', resolve)
      return
    }

    process.nextTick(resolve)
  })
}

const resolvePromptContext = async ({
  res,
  course,
  generationInfo,
}: {
  res: express.Response
  course: ChatInstance | null
  generationInfo: StreamRequest['options']['generationInfo']
}): Promise<PromptContext> => {
  if (generationInfo.promptInfo.type !== 'saved') {
    return {
      prompt: null,
      systemMessage: generationInfo.promptInfo.systemMessage,
      tools: [],
    }
  }

  const prompt = await Prompt.findByPk(generationInfo.promptInfo.id, {
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

  const tools = prompt.ragIndex ? [generationInfo.model === 'mock' ? getMockRagIndexSearchTool(prompt.ragIndex) : getRagIndexSearchTool(prompt.ragIndex)] : []

  if (prompt.ragIndex) {
    res.locals.chatCompletionMeta.ragIndexId = prompt.ragIndex.id
    res.locals.chatCompletionMeta.ragIndex = prompt.ragIndex.metadata.name
  }

  res.locals.chatCompletionMeta.promptId = prompt.id
  res.locals.chatCompletionMeta.promptName = prompt.name

  return {
    prompt,
    systemMessage: prompt.systemMessage,
    tools,
  }
}

const ensureUsageAllowed = ({ user, course, model }: { user: RequestWithUser['user']; course: ChatInstance | null; model: ValidModelName }) => {
  const isFreeModel = model === FREE_MODEL
  const usageAllowed = (course ? checkCourseUsage(user, course) : isFreeModel) || checkUsage(user, model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  return { isFreeModel }
}

const chargeUsage = async ({
  req,
  course,
  prompt,
  isFreeModel,
  result,
}: {
  req: RequestWithUser
  course: ChatInstance | null
  prompt: Prompt | null
  isFreeModel: boolean
  result: Awaited<ReturnType<typeof streamAgentChat>>
}) => {
  if (isFreeModel) {
    return
  }

  let userToCharge = req.user
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
    return
  }

  await incrementUsage(userToCharge, totalTokenCount)
}

const storeResultMeta = ({ res, tools, result }: { res: express.Response; tools: StructuredTool[]; result: Awaited<ReturnType<typeof streamAgentChat>> }) => {
  Object.assign(res.locals.chatCompletionMeta, {
    tools: tools.map((tool) => tool.name),
    tokenCount: result.tokenCount + result.inputTokenCount,
    outputTokenCount: result.tokenCount,
    inputTokenCount: result.inputTokenCount,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
    toolCalls: result.toolCalls,
  })
}

const saveDiscussionIfNeeded = async ({
  req,
  options,
  course,
  courseId,
  response,
}: {
  req: RequestWithUser
  options: StreamRequest['options']
  course: ChatInstance | null
  courseId?: string
  response: string
}) => {
  const consentToSave = courseId && course?.saveDiscussions && options.saveConsent

  if (!consentToSave) {
    return
  }

  await Discussion.create({
    userId: req.user.id,
    courseId,
    response,
    metadata: options,
  })
}

const handleStreamRequest = async (request: express.Request, res: express.Response) => {
  const { req, options, courseId } = parseStreamRequest(request)
  const { generationInfo } = options

  debugV4('received stream request', {
    model: generationInfo.model,
    temperature: generationInfo.temperature,
    courseId,
    chatMessageCount: options.chatMessages.length,
    promptInfoType: generationInfo.promptInfo.type,
    fileSize: req.file?.size,
  })

  ensureModelAllowedForUser(generationInfo.model, req.user.isAdmin)
  initializeResponseMeta({ res, courseId, model: generationInfo.model, fileSize: req.file?.size })

  const course = await resolveCourseContext({ req, res, courseId })
  configureStreamResponse(res)
  const writeEvent = createWriteEvent(res)
  const { prompt, systemMessage, tools } = await resolvePromptContext({ req, res, course, generationInfo })
  const { isFreeModel } = ensureUsageAllowed({ user: req.user, course, model: generationInfo.model })

  const result = await streamAgentChat({
    user: req.user,
    chatMessages: options.chatMessages,
    systemMessage,
    promptMessages: prompt?.messages,
    model: generationInfo.model,
    temperature: generationInfo.temperature ?? undefined,
    tools,
    writeEvent,
  })

  debugV4('agent stream finished', {
    model: generationInfo.model,
    responseLength: result.response.length,
    tokenCount: result.tokenCount,
    inputTokenCount: result.inputTokenCount,
    toolCalls: result.toolCalls,
  })

  await chargeUsage({ req, course, prompt, isFreeModel, result })
  storeResultMeta({ res, tools, result })
  await saveDiscussionIfNeeded({ req, options, course, courseId, response: result.response })
  res.end()
}

router.post('/stream', upload.single('file'), handleStreamRequest)

export default router
