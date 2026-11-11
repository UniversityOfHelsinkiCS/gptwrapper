import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { isGraphInterrupt } from '@langchain/langgraph'
import { createAgent, createMiddleware, ToolMessage } from 'langchain'
import type { z } from 'zod/v4'
import { DEFAULT_TOKEN_LIMIT, inProduction, isFreeModel, isMockModel, ModelProvider, type ModelConfig, type ValidModelName, validModels } from '@config'
import type { AiApiWarning } from '@shared/aiApi'
import type { ChatEvent, PostStreamSchemaV4 } from '@shared/agentChat'
import { isPromptDraft } from '@shared/prompt'
import { PRESENT_QUIZ } from '@shared/quiz'
import type { ChatMessage } from '@shared/chat'
import type { AccessLevel } from '@shared/types'
import type { User } from '@shared/user'
import { ChatInstance, Discussion, Prompt, PromptUsage, RagIndex, UserChatInstanceUsage } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'
import { getAccessLevel, requireActiveAccess } from '../chatInstances/access'
import { checkCourseUsage, checkUsage, getCourseTokenLimit, getUsage, getUserTokenLimit, incrementCourseUsage, incrementUsage } from '../chatInstances/usage'
import { handleWarnings, modelConfigHasInstructions, prepareMessagesForLLM } from './prepareMessages'
import { MockModel } from '../langchain/MockModel'
import { getAzureChatOpenAI, getToskaProvider, getVertexModelProvider } from '../langchain/modelGenerators'
import { createStreamState, getMainAgentModelCall, getSubagentModelCall, mapStreamChunk, nextStreamState, type StreamChunk } from './mapStreamChunk'
import type { ClientToolCaller } from './clientTools'
import { fileToolsFor } from './tools/fileTools'
import { MOCK_SUBAGENT } from './tools/mockSubagent'
import { findQuizPart, quizAnswerToText } from './tools/presentQuiz'
import { promptEnabledTools } from './tools/promptTools'
import { createTools, getToolModule, historyMessageToText, withToolInstructions } from './tools/registry'
import { ToolError, type EnabledTool } from './tools/types'

export const RECURSION_LIMIT = 25
const KEEP_ALIVE_INTERVAL_MS = 5000
const GENERATION_ERROR = 'Error while generating response'
/** Tools the mock model always has, for its `subagent` and `quiz` prefixes. */
const MOCK_MODEL_TOOLS = [MOCK_SUBAGENT, PRESENT_QUIZ]

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
  /**
   * Client-executed tools, only for runs over the chat socket by admins: the My files tools on the attached folders
   * (maybe none) and `Outputs/` and `Agent notes/`, called in the browser through `call`.
   */
  clientTools?: { attachedFolders: string[]; call: ClientToolCaller }
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
export const runAgent = async ({ user, chargeUser = user, request, meta, signal, onStart, emit, clientTools }: RunAgentParams): Promise<RunAgentResult> => {
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

  const { prompt, systemMessage, enabledTools } = await resolvePrompt(user, generationInfo, course, meta)

  const isFree = isFreeModel(model)
  const tokenLimit = course ? getCourseTokenLimit(course.chatInstance) : isFree ? DEFAULT_TOKEN_LIMIT : await getUserTokenLimit(user)
  const usageAllowed = course ? checkCourseUsage(user, course.chatInstance, tokenLimit) : isFree || checkUsage(user, await getUsage(user.id), tokenLimit)

  if (!usageAllowed && !isFree) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  // The mock model always has the mock subagent and the quiz, for its `subagent` and `quiz` prefixes (e2e tests),
  // whatever the prompt has. Other models only get the prompt's tools.
  if (isMockModel(model)) {
    for (const name of MOCK_MODEL_TOOLS) {
      if (!enabledTools.some((t) => t.name === name)) enabledTools.push({ name })
    }
  }

  // The file tools are always on for admins' socket runs whose browser runs them, whatever the prompt has.
  if (clientTools) {
    enabledTools.push(...fileToolsFor(clientTools.attachedFolders).filter((tool) => !enabledTools.some((t) => t.name === tool.name)))
  }

  meta.tools = enabledTools.map((t) => t.name)

  // Discussions are saved with this text history too, so saved discussions keep the `content` shape they always had.
  const history = toModelHistory(options.chatMessages)
  const instructionMessage = modelConfigHasInstructions(modelConfig) ? [{ role: 'system' as const, content: modelConfig.instructions }] : []
  const { messages, warnings, inputTokenCount } = handleWarnings(
    modelConfig,
    [
      ...instructionMessage,
      ...(prompt?.messages ?? []),
      { role: 'system', content: withToolInstructions(systemMessage, enabledTools) },
      ...prepareMessagesForLLM(history),
    ],
    options.ignoredWarnings,
    tokenLimit,
  )
  meta.inputTokenCount = inputTokenCount

  if (warnings.length > 0) {
    meta.warnings = warnings.map((w) => w.warningType)
    return { status: 'warnings', warnings }
  }

  onStart()

  const tools = createTools(enabledTools, { user, course: course?.chatInstance ?? null, model, signal, callClientTool: clientTools?.call })
  const agent = createAgent({ model: getAgentModel(modelConfig), tools, middleware: tools.length > 0 ? [toolErrorMiddleware(signal)] : [] })

  const showReasoning = modelConfig.reasoning?.showSummary === true
  const startedAt = Date.now()
  let firstTokenAt: number | undefined
  let inputTokens = 0
  let outputTokens = 0
  let modelCalls = 0
  const toolCalls: string[] = []
  let response = ''
  // Subagents' model calls are not charged to the user but logged per subagent tool.
  const subagentNames = new Map<string, string>()
  const subagentUsage: Record<string, SubagentUsage> = {}

  const keepAlive = setInterval(() => {
    emit({ type: 'processing' }).catch((error) => logger.error('Failed to write keep-alive', { error }))
  }, KEEP_ALIVE_INTERVAL_MS)

  try {
    const stream = await agent.stream({ messages }, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true, signal, recursionLimit: RECURSION_LIMIT })
    let streamState = createStreamState(enabledTools.map((t) => t.name).filter((name) => getToolModule(name)?.kind === 'subagent'))

    for await (const chunk of stream) {
      const streamChunk = chunk as StreamChunk
      streamState = nextStreamState(streamState, streamChunk)

      const call = getMainAgentModelCall(streamChunk)
      if (call) {
        modelCalls++
        inputTokens += call.inputTokens
        outputTokens += call.outputTokens
        toolCalls.push(...call.toolCalls)
      }

      // TODO: check this
      const subagentCall = getSubagentModelCall(streamChunk, streamState)
      if (subagentCall) {
        const name = subagentNames.get(subagentCall.callId) ?? 'unknown'
        const usage = (subagentUsage[name] ??= { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: [] })
        usage.modelCalls++
        usage.inputTokens += subagentCall.inputTokens
        usage.outputTokens += subagentCall.outputTokens
        usage.toolCalls.push(...subagentCall.toolCalls)
      }

      for (const event of mapStreamChunk(streamChunk, streamState)) {
        if (event.type === 'subagent.start') subagentNames.set(event.callId, event.name)
        // Models without a reasoning config look as before, even if their provider streams reasoning anyway.
        if (event.type === 'reasoning.delta' && !showReasoning) continue
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
      // The content-filter explanation is shown as the assistant's answer.
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
    subagentUsage: Object.keys(subagentUsage).length > 0 ? JSON.stringify(subagentUsage) : undefined,
  })

  if (courseId && course?.chatInstance.saveDiscussions) {
    await Discussion.create({ userId: user.id, courseId, response, metadata: { ...options, chatMessages: history } })
  }

  return { status: 'completed' }
}

/** Model calls of one subagent tool in a run, summed over its calls. Logged in `chatCompletionMeta.subagentUsage`. */
type SubagentUsage = { modelCalls: number; inputTokens: number; outputTokens: number; toolCalls: string[] }

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
): Promise<{ prompt: Prompt | null; systemMessage: string; enabledTools: EnabledTool[] }> => {
  if (generationInfo.promptInfo.type !== 'saved') {
    return { prompt: null, systemMessage: generationInfo.promptInfo.systemMessage, enabledTools: [] }
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

  // document_search is still derived from the prompt's RAG index; the other tools come from `prompt.tools`.
  const enabledTools = promptEnabledTools(prompt)
  if (prompt.ragIndex) {
    meta.ragIndexId = prompt.ragIndex.id
    meta.ragIndex = prompt.ragIndex.metadata.name
  }

  Object.assign(meta, {
    promptId: prompt.id,
    promptName: prompt.name,
    promptType: prompt.type,
    promptLanguage: prompt.language ?? null,
  })

  return { prompt, systemMessage: prompt.systemMessage, enabledTools }
}

/**
 * The history as the model gets it: assistant messages with `parts` become text, tool parts summarised by their
 * tool module. A quiz answer becomes a text made from the answer and its quiz, instead of its display `content`.
 */
const toModelHistory = (chatMessages: RunAgentRequest['options']['chatMessages']): ChatMessage[] =>
  chatMessages.map((message, index): ChatMessage => {
    if ('parts' in message) return { role: 'assistant', content: historyMessageToText(message) }
    if (message.role === 'user' && message.quizAnswer) {
      const earlierParts = chatMessages.slice(0, index).flatMap((earlier) => ('parts' in earlier ? [earlier.parts] : []))
      return { role: 'user', content: quizAnswerToText(message.quizAnswer, findQuizPart(earlierParts, message.quizAnswer.callId)) }
    }
    return message
  })

/**
 * Turns a failing tool into an error `ToolMessage` (status `error`, so the client shows the call as failed)
 * that the model can react to. Without this the agent's default handler hides the failure in a normal result.
 */
const toolErrorMiddleware = (signal: AbortSignal) =>
  createMiddleware({
    name: 'ToolErrors',
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request)
      } catch (error) {
        if (signal.aborted || isGraphInterrupt(error)) throw error
        if (error instanceof ToolError) {
          // An expected failure (a refused path, a missing file, no answer from the browser) that the model can act on.
          logger.info('Tool call failed', { tool: request.toolCall.name, error: error.message })
          return new ToolMessage({
            content: `Error: ${error.message}`,
            tool_call_id: request.toolCall.id ?? '',
            name: request.toolCall.name,
            status: 'error',
          })
        }
        logger.error('Tool call failed', {
          tool: request.toolCall.name,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        })
        return new ToolMessage({
          content: 'The tool failed. Tell the user it did not work, and answer without it if you can.',
          tool_call_id: request.toolCall.id ?? '',
          name: request.toolCall.name,
          status: 'error',
        })
      }
    },
  })

/** The chat model without bound tools: createAgent binds the tools itself and refuses a pre-bound model. */
const getAgentModel = (modelConfig: ModelConfig): BaseChatModel => {
  switch (modelConfig.provider) {
    case ModelProvider.Azure:
      return getAzureChatOpenAI(modelConfig.name, true, modelConfig.reasoning)
    case ModelProvider.Vertex:
      return getVertexModelProvider(modelConfig)
    case ModelProvider.Toska:
      return getToskaProvider(modelConfig.name, true, modelConfig.reasoning)
    case ModelProvider.Mock:
      return new MockModel({})
    default:
      throw new Error(`Unknown model provider: ${modelConfig.provider}`)
  }
}

/** Azure refuses some prompts with `code: 'content_filter'`; the explanation is shown as the answer. */
const getContentFilterMessage = (error: unknown): string | null => {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'content_filter') return null
  const innerError = 'error' in error ? (error.error as { message?: string } | undefined) : undefined
  return innerError?.message ?? 'The response was not generated due to the prompt triggering content filters. No further details available.'
}
