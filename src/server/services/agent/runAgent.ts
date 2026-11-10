import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { StructuredTool } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import type { z } from 'zod/v4'
import { DEFAULT_TOKEN_LIMIT, inProduction, isFreeModel, isMockModel, ModelProvider, type ModelConfig, type ValidModelName, validModels } from '@config'
import type { AiApiWarning } from '@shared/aiApi'
import type { ChatEvent, PostStreamSchemaV4 } from '@shared/agentChat'
import { isPromptDraft } from '@shared/prompt'
import type { AccessLevel } from '@shared/types'
import type { User } from '@shared/user'
import { ChatInstance, Discussion, Prompt, PromptUsage, RagIndex, UserChatInstanceUsage } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import { getAccessLevel, requireActiveAccess } from '../chatInstances/access'
import { checkCourseUsage, checkUsage, getCourseTokenLimit, getUsage, getUserTokenLimit, incrementCourseUsage, incrementUsage } from '../chatInstances/usage'
import { handleWarnings, modelConfigHasInstructions, prepareMessagesForLLM } from '../langchain/chat'
import { MockModel } from '../langchain/MockModel'
import { getAzureChatOpenAI, getToskaProvider, getVertexModelProvider } from '../langchain/modelGenerators'
import { getMockRagIndexSearchTool } from '../rag/mockSearchTool'
import { getRagIndexSearchTool } from '../rag/searchTool'
import { getMainAgentModelCall, mapStreamChunk, type StreamChunk } from './mapStreamChunk'

export const RECURSION_LIMIT = 25
const KEEP_ALIVE_INTERVAL_MS = 5000
const GENERATION_ERROR = 'Error while generating response'

export type RunAgentRequest = z.output<typeof PostStreamSchemaV4>

export type RunAgentParams = {
  /** The user chatting. */
  user: User
  /** Who pays for the tokens. Defaults to `user`; the HTTP route passes the admin when hijacking in production. */
  chargeUser?: User
  request: RunAgentRequest
  /** Run metadata for the request log (`res.locals.chatCompletionMeta` in the HTTP route). Filled in place. */
  meta: Record<string, unknown>
  signal: AbortSignal
  /** Called once, after all checks have passed and just before the first event is emitted. */
  onStart: () => void
  emit: (event: ChatEvent) => Promise<void>
}

export type RunAgentResult =
  /** Nothing was streamed; the client must confirm the warnings and resend with them in `ignoredWarnings`. */
  { status: 'warnings'; warnings: AiApiWarning[] } | { status: 'completed' } | { status: 'aborted' }

/**
 * Runs one chat turn as a LangChain agent and emits `ChatEvent`s. Transport-agnostic: the HTTP NDJSON route
 * (and later a WebSocket handler) only supply `emit`, `onStart` and the abort signal.
 *
 * Throws `ApplicationError` (404/403) before `onStart` when the course, prompt, model or usage checks fail.
 * Errors during generation are emitted as an `error` event instead of thrown.
 */
export const runAgent = async ({ user, chargeUser = user, request, meta, signal, onStart, emit }: RunAgentParams): Promise<RunAgentResult> => {
  const { options, courseId } = request
  const { generationInfo } = options
  const model = generationInfo.model

  ensureModelAllowedForUser(model, user.isAdmin)

  const modelConfig = validModels.find((m) => m.name === model)
  if (!modelConfig) {
    throw ApplicationError.BadRequest(`Invalid model: ${model}`)
  }

  Object.assign(meta, { courseId, model })

  const course = courseId ? await getCourse(user, courseId) : null
  if (course) {
    meta.course = course.chatInstance.name?.fi
  }

  const { prompt, systemMessage, tools } = await resolvePrompt(user, generationInfo, course, meta)

  const isFree = isFreeModel(model)
  const tokenLimit = course ? getCourseTokenLimit(course.chatInstance) : isFree ? DEFAULT_TOKEN_LIMIT : await getUserTokenLimit(user)
  const usageAllowed = course ? checkCourseUsage(user, course.chatInstance, tokenLimit) : isFree || checkUsage(user, await getUsage(user.id), tokenLimit)

  if (!usageAllowed && !isFree) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  meta.tools = tools.map((t) => t.name)

  const instructionMessage = modelConfigHasInstructions(modelConfig) ? [{ role: 'system' as const, content: modelConfig.instructions }] : []
  const { messages, warnings, inputTokenCount } = handleWarnings(
    modelConfig,
    [...instructionMessage, ...(prompt?.messages ?? []), { role: 'system', content: systemMessage }, ...prepareMessagesForLLM(options.chatMessages)],
    options.ignoredWarnings,
    tokenLimit,
  )
  meta.inputTokenCount = inputTokenCount

  if (warnings.length > 0) {
    meta.warnings = warnings.map((w) => w.warningType)
    return { status: 'warnings', warnings }
  }

  onStart()

  const agent = createAgent({ model: getAgentModel(modelConfig), tools })

  const startedAt = Date.now()
  let firstTokenAt: number | undefined
  let inputTokens = 0
  let outputTokens = 0
  let modelCalls = 0
  const toolCalls: string[] = []
  let response = ''

  const keepAlive = setInterval(() => {
    emit({ type: 'processing' }).catch((error) => logger.error('Failed to write keep-alive', { error }))
  }, KEEP_ALIVE_INTERVAL_MS)

  try {
    const stream = await agent.stream({ messages }, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true, signal, recursionLimit: RECURSION_LIMIT })

    for await (const chunk of stream) {
      const streamChunk = chunk as StreamChunk

      const call = getMainAgentModelCall(streamChunk)
      if (call) {
        modelCalls++
        inputTokens += call.inputTokens
        outputTokens += call.outputTokens
        toolCalls.push(...call.toolCalls)
      }

      for (const event of mapStreamChunk(streamChunk)) {
        if (event.type === 'text.delta' && event.path.length === 0) {
          firstTokenAt ??= Date.now()
          response += event.text
        }
        await emit(event)
      }
    }
  } catch (error) {
    if (signal.aborted) {
      logger.info('Agent run aborted', { reason: signal.reason, model })
      return { status: 'aborted' }
    }

    const contentFilterMessage = getContentFilterMessage(error)
    if (contentFilterMessage) {
      // Same as v3: the content-filter explanation is shown as the assistant's answer.
      await emit({ type: 'text.delta', path: [], text: contentFilterMessage })
      return { status: 'completed' }
    }

    // Errors from inside the graph only serialise their own fields (pregelTaskId), so log message and stack explicitly.
    logger.error('Agent run failed', { model, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error })
    await emit({ type: 'error', error: GENERATION_ERROR })
    return { status: 'completed' }
  } finally {
    clearInterval(keepAlive)
  }

  await emit({ type: 'usage', inputTokens, outputTokens })

  const totalTokens = inputTokens + outputTokens
  if (!isFree) {
    if (course) {
      await incrementCourseUsage(course.chatInstance, totalTokens)
      await PromptUsage.create({
        chatInstanceId: course.chatInstance.id,
        promptId: prompt?.id ?? null,
        userId: chargeUser.id,
        tokenCount: totalTokens,
      })
    } else {
      await incrementUsage(chargeUser, totalTokens)
    }
  }

  const streamingMs = firstTokenAt ? Date.now() - firstTokenAt : 0
  Object.assign(meta, {
    inputTokenCount: inputTokens,
    outputTokenCount: outputTokens,
    tokenCount: totalTokens,
    modelCalls,
    timeToFirstToken: firstTokenAt ? firstTokenAt - startedAt : undefined,
    tokensPerSecond: streamingMs > 0 ? (outputTokens / streamingMs) * 1000 : undefined,
    toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
  })

  if (courseId && course?.chatInstance.saveDiscussions) {
    await Discussion.create({ userId: user.id, courseId, response, metadata: options })
  }

  return { status: 'completed' }
}

const ensureModelAllowedForUser = (model: ValidModelName, isAdmin: boolean) => {
  if (inProduction && isMockModel(model) && !isAdmin) {
    throw ApplicationError.Forbidden('Mock model is restricted to admins in production')
  }
}

type CourseContext = { chatInstance: ChatInstance; accessLevel: AccessLevel }

const getCourse = async (user: User, courseId: string): Promise<CourseContext> => {
  const chatInstance = await ChatInstance.findOne({ where: { courseId } })
  if (!chatInstance) {
    throw ApplicationError.NotFound('Course not found')
  }

  const accessLevel = await requireActiveAccess(user, chatInstance)

  const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
    where: { userId: user.id, chatInstanceId: chatInstance.id },
  })
  chatInstance.currentUserUsage = chatInstanceUsage

  return { chatInstance, accessLevel }
}

const resolvePrompt = async (
  user: User,
  generationInfo: RunAgentRequest['options']['generationInfo'],
  course: CourseContext | null,
  meta: Record<string, unknown>,
): Promise<{ prompt: Prompt | null; systemMessage: string; tools: StructuredTool[] }> => {
  if (generationInfo.promptInfo.type !== 'saved') {
    return { prompt: null, systemMessage: generationInfo.promptInfo.systemMessage, tools: [] }
  }

  const prompt = await Prompt.findByPk(generationInfo.promptInfo.id, {
    ...(course ? { where: { chatInstanceId: course.chatInstance.id } } : {}),
    include: [{ model: RagIndex, as: 'ragIndex', required: false }],
  })

  if (!prompt) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  if (isPromptDraft(prompt)) {
    const promptCourse = course?.chatInstance ?? (prompt.chatInstanceId ? await ChatInstance.findByPk(prompt.chatInstanceId) : null)
    const promptAccessLevel = course ? course.accessLevel : promptCourse ? await getAccessLevel(user, promptCourse) : null
    if (promptAccessLevel !== 'FULL') {
      throw ApplicationError.NotFound('Prompt not found')
    }
  }

  if (prompt.type === 'TEMPLATE') {
    throw ApplicationError.Forbidden('Template prompts must be copied before use')
  }
  if (prompt.type === 'PERSONAL' && prompt.userId !== user.id) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  const tools: StructuredTool[] = []
  if (prompt.ragIndex) {
    tools.push(isMockModel(generationInfo.model) ? getMockRagIndexSearchTool(prompt.ragIndex) : getRagIndexSearchTool(prompt.ragIndex))
    meta.ragIndexId = prompt.ragIndex.id
    meta.ragIndex = prompt.ragIndex.metadata.name
  }

  Object.assign(meta, {
    promptId: prompt.id,
    promptName: prompt.name,
    promptType: prompt.type,
    promptLanguage: prompt.language ?? null,
  })

  return { prompt, systemMessage: prompt.systemMessage, tools }
}

/** The chat model without bound tools: createAgent binds the tools itself and refuses a pre-bound model. */
const getAgentModel = (modelConfig: ModelConfig): BaseChatModel => {
  switch (modelConfig.provider) {
    case ModelProvider.Azure:
      return getAzureChatOpenAI(modelConfig.name)
    case ModelProvider.Vertex:
      return getVertexModelProvider(modelConfig)
    case ModelProvider.Toska:
      return getToskaProvider(modelConfig.name)
    case ModelProvider.Mock:
      return new MockModel({ tools: [] })
    default:
      throw new Error(`Unknown model provider: ${modelConfig.provider}`)
  }
}

/** Azure refuses some prompts with `code: 'content_filter'`; v3 shows the explanation as the answer. */
const getContentFilterMessage = (error: unknown): string | null => {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'content_filter') return null
  const innerError = 'error' in error ? (error.error as { message?: string } | undefined) : undefined
  return innerError?.message ?? 'The response was not generated due to the prompt triggering content filters. No further details available.'
}
