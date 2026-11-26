import { randomUUID } from 'node:crypto'
import { MemorySaver } from '@langchain/langgraph'
import { createAgent } from 'langchain'
import type { z } from 'zod/v4'
import { DEFAULT_TOKEN_LIMIT, getUsageEnforcement, inProduction, isFreeModel, isMockModel, type ValidModelName, validModels } from '@config'
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
import { recordModelUsage } from '../chatInstances/modelUsage'
import { getBudgetUsage, isBudgetExhausted } from '../chatInstances/costBudget'
import { handleWarnings, modelConfigHasInstructions, prepareMessagesForLLM, type UsageWarningLimit } from './prepareMessages'
import { getAgentModel } from './agentModel'
import { describeGenerationError } from './generationError'
import { keepFailedRun, readMissedCallUpdate, readResumeState, takeFailedRun } from './resumableRuns'
import {
  createStreamState,
  getMainAgentModelCall,
  getSubagentModelCall,
  isMainAgentModelChunk,
  mapStreamChunk,
  nextStreamState,
  type StreamChunk,
} from './mapStreamChunk'
import { createRunUsage } from './runUsage'
import { featureEventsForMessage } from './chatFeatureEvents'
import { recordFeatureEvent } from '../featureEvents'
import type { ClientToolCaller } from './clientTools'
import { fileToolsFor } from './tools/fileTools'
import { readPdfFor } from './tools/readPdf'
import { MOCK_SUBAGENT } from './tools/mockSubagent'
import { findQuizPart, quizAnswerToText } from './tools/presentQuiz'
import { promptEnabledTools } from './tools/promptTools'
import { createTools, getToolModule, historyMessageToText, subagentCallLimits, withToolInstructions } from './tools/registry'
import type { EnabledTool } from './tools/types'
import { callLimitMiddleware, modelCallBudgetMiddleware, toolErrorMiddleware } from './toolMiddleware'

/** The most model calls of the main agent in one run; the last one must answer without tools. */
export const MAX_MODEL_CALLS = 12
/**
 * The graph steps of `MAX_MODEL_CALLS` model calls and the tool steps between them, with some spare. Only a safety
 * net: `modelCallBudgetMiddleware` ends the run before it.
 */
export const RECURSION_LIMIT = 2 * MAX_MODEL_CALLS + 5
const KEEP_ALIVE_INTERVAL_MS = 5000
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
   * Client-executed tools, for runs over the chat socket (any user, not the HTTP route): the My files tools on the attached folders
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

  const usageLimit = await checkUsageLimit(user, chargeUser, model, course)

  // The mock model always has the mock subagent and the quiz, for its `subagent` and `quiz` prefixes (e2e tests),
  // whatever the prompt has. Other models only get the prompt's tools.
  if (isMockModel(model)) {
    for (const name of MOCK_MODEL_TOOLS) {
      if (!enabledTools.some((t) => t.name === name)) enabledTools.push({ name })
    }
  }

  // The file tools are always on for socket runs whose browser runs them, whatever the prompt has.
  if (clientTools) {
    const clientRunTools = [...fileToolsFor(clientTools.attachedFolders), ...readPdfFor(clientTools.attachedFolders)]
    enabledTools.push(...clientRunTools.filter((tool) => !enabledTools.some((t) => t.name === tool.name)))
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
    usageLimit,
  )
  meta.inputTokenCount = inputTokenCount

  if (warnings.length > 0) {
    meta.warnings = warnings.map((w) => w.warningType)
    return { status: 'warnings', warnings }
  }

  // Every run keeps its checkpoints in memory, so a run that fails can be continued from the step that failed. A retry
  // of a run that is gone (restart, another server, expired) starts over.
  const resumed = options.resumeRunId ? await takeFailedRun(user.id, options.resumeRunId) : null
  const runId = resumed && options.resumeRunId ? options.resumeRunId : randomUUID()
  const checkpointer = resumed ?? new MemorySaver()
  const resumeState = resumed ? await readResumeState(resumed, runId) : null
  meta.resumed = !!resumed

  // Every check has passed. A retry of a failed run (resumed, or started over when the run is gone) is not a new send.
  if (!options.resumeRunId) {
    const lastUserMessage = options.chatMessages.findLast((message) => message.role === 'user')
    if (lastUserMessage && !('parts' in lastUserMessage)) {
      for (const event of featureEventsForMessage(lastUserMessage)) recordFeatureEvent(event)
    }
  }

  onStart()

  const tools = createTools(enabledTools, { user, course: course?.chatInstance ?? null, model, signal, callClientTool: clientTools?.call })
  const agent = createAgent({
    model: getAgentModel(modelConfig),
    tools,
    checkpointer,
    middleware:
      tools.length > 0
        ? [
            modelCallBudgetMiddleware(MAX_MODEL_CALLS, resumeState?.modelCalls),
            callLimitMiddleware(subagentCallLimits(enabledTools), resumeState?.toolCalls),
            toolErrorMiddleware(signal),
          ]
        : [],
  })

  const showReasoning = modelConfig.reasoning?.showSummary === true
  const startedAt = Date.now()
  let firstTokenAt: number | undefined
  // Time the main agent's model calls spent streaming, without tool runs in between. For `tokensPerSecond`.
  let callStreamStartedAt: number | undefined
  let streamingMs = 0
  let inputTokens = 0
  let outputTokens = 0
  let modelCalls = 0
  const toolCalls: string[] = []
  let response = ''
  // Subagents' model calls are not in the token counters but logged per subagent tool.
  const subagentNames = new Map<string, string>()
  const subagentUsage: Record<string, SubagentUsage> = {}
  // Every model call, subagents' included, by the model that ran it.
  const runUsage = createRunUsage(model)

  const keepAlive = setInterval(() => {
    emit({ type: 'processing' }).catch((error) => logger.error('Failed to write keep-alive', { error }))
  }, KEEP_ALIVE_INTERVAL_MS)

  let streamState = createStreamState(enabledTools.map((t) => t.name).filter((name) => getToolModule(name)?.kind === 'subagent'))
  // Main agent tool calls the client has seen start and end, to emit what a failing stream lost (`readMissedCallUpdate`).
  const startedCalls = new Set<string>(resumeState?.startedCallIds)
  const endedCalls = new Set<string>(resumeState?.endedCallIds)

  /**
   * Charges the model calls that finished and fills the token fields of the run log. Failed and aborted runs are
   * charged too, for the calls that finished before the failure; a resumed run does not run those calls again.
   */
  const chargeRun = async () => {
    const totalTokens = inputTokens + outputTokens
    if (!isFreeModel(model) && modelCalls > 0) {
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
    // Recorded for free models too: the cost budget has no free models.
    try {
      if (Object.keys(runUsage.usage).length > 0)
        await recordModelUsage({ userId: chargeUser.id, courseUsageId: course?.chatInstance.currentUserUsage?.id, usage: runUsage.usage })
    } catch (error) {
      // Under cost enforcement this usage goes unbilled.
      const message = getUsageEnforcement() === 'cost' ? 'Failed to record model usage, usage not billed' : 'Failed to record model usage'
      logger.error(message, { model, userId: chargeUser.id, error: error instanceof Error ? error.message : error })
    }

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
  }

  /** On the error paths a failed charge is only logged, so it cannot hide the run's own outcome. */
  const chargeFailedRun = async (outcome: string) => {
    meta.runOutcome = outcome
    try {
      await chargeRun()
    } catch (error) {
      logger.error('Failed to charge the usage of a failed or aborted run', {
        model,
        userId: chargeUser.id,
        error: error instanceof Error ? error.message : error,
      })
    }
  }

  try {
    if (resumeState) await emit({ type: 'resumed', pendingCallIds: resumeState.pendingCallIds })
    // A `null` input continues the thread from its latest checkpoint: only the step that failed runs again.
    const stream = await agent.stream(resumeState ? (null as unknown as { messages: typeof messages }) : { messages }, {
      configurable: { thread_id: runId },
      streamMode: ['messages', 'updates', 'custom'],
      subgraphs: true,
      signal,
      recursionLimit: RECURSION_LIMIT,
    })

    for await (const chunk of stream) {
      const streamChunk = chunk as StreamChunk
      streamState = nextStreamState(streamState, streamChunk)

      if (isMainAgentModelChunk(streamChunk)) {
        callStreamStartedAt ??= Date.now()
        firstTokenAt ??= callStreamStartedAt
      }

      const call = getMainAgentModelCall(streamChunk)
      if (call) {
        if (callStreamStartedAt) streamingMs += Date.now() - callStreamStartedAt
        callStreamStartedAt = undefined
        modelCalls++
        inputTokens += call.inputTokens
        outputTokens += call.outputTokens
        toolCalls.push(...call.toolCalls)
        runUsage.addMainCall(call.usage)
      }

      // TODO: check this
      const subagentCall = getSubagentModelCall(streamChunk, streamState)
      if (subagentCall) {
        const name = subagentNames.get(subagentCall.callId) ?? 'unknown'
        runUsage.addSubagentCall(subagentNames.get(subagentCall.callId), subagentCall.usage)
        const usage = (subagentUsage[name] ??= { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: [] })
        usage.modelCalls++
        usage.inputTokens += subagentCall.inputTokens
        usage.outputTokens += subagentCall.outputTokens
        usage.toolCalls.push(...subagentCall.toolCalls)
      }

      for (const event of mapStreamChunk(streamChunk, streamState)) {
        if (event.type === 'subagent.start') subagentNames.set(event.callId, event.name)
        if ((event.type === 'tool.start' || event.type === 'subagent.start') && event.path.length === 0) startedCalls.add(event.callId)
        if ((event.type === 'tool.end' || event.type === 'subagent.end') && event.path.length === 0) endedCalls.add(event.callId)
        // Models without a reasoning config look as before, even if their provider streams reasoning anyway.
        if (event.type === 'reasoning.delta' && !showReasoning) continue
        if (event.type === 'text.delta' && event.path.length === 0) response += event.text
        await emit(event)
      }
    }
  } catch (error) {
    if (signal.aborted) {
      logger.info('Agent run aborted', { reason: signal.reason, model })
      await chargeFailedRun('aborted')
      return { status: 'aborted' }
    }

    const contentFilterMessage = getContentFilterMessage(error)
    if (contentFilterMessage) {
      await chargeFailedRun('content_filter')
      // The content-filter explanation is shown as the assistant's answer.
      await emit({ type: 'text.delta', path: [], text: contentFilterMessage })
      return { status: 'completed' }
    }

    // Errors from inside the graph only serialise their own fields (pregelTaskId), so log message and stack explicitly.
    logger.error('Agent run failed', { model, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error })
    try {
      const missed = await readMissedCallUpdate(checkpointer, runId, startedCalls, endedCalls)
      if (missed) for (const event of mapStreamChunk([[], 'updates', missed], streamState)) await emit(event)
    } catch (missedError) {
      logger.error('Failed to emit the tool calls of a failed run', { error: missedError instanceof Error ? missedError.message : missedError })
    }
    await keepFailedRun(user.id, runId, checkpointer)
    await chargeFailedRun('failed')
    await emit({ type: 'error', error: describeGenerationError(error), resumeId: runId })
    return { status: 'completed' }
  } finally {
    clearInterval(keepAlive)
  }

  await emit({ type: 'usage', inputTokens, outputTokens })
  await chargeRun()

  if (courseId && course?.chatInstance.saveDiscussions) {
    await Discussion.create({ userId: user.id, courseId, response, metadata: { ...options, chatMessages: history } })
  }

  return { status: 'completed' }
}

/** Model calls of one subagent tool in a run, summed over its calls. Logged in `chatCompletionMeta.subagentUsage`. */
type SubagentUsage = { modelCalls: number; inputTokens: number; outputTokens: number; toolCalls: string[] }

/**
 * Throws 403 when the user may not run: under `USAGE_ENFORCEMENT=tokens` the token limit of the course or the general
 * chat (free models exempt), under `cost` the weekly budget of the charged user on every model (admins exempt).
 * Returns the limit the pre-send usage warning compares with.
 */
const checkUsageLimit = async (user: User, chargeUser: User, model: ValidModelName, course: CourseContext | null): Promise<UsageWarningLimit> => {
  if (getUsageEnforcement() === 'cost') {
    const budgetUsage = await getBudgetUsage(chargeUser)
    if (!chargeUser.isAdmin && isBudgetExhausted(budgetUsage)) {
      logger.info('Usage limit reached', { userId: chargeUser.id, cost: budgetUsage.cost, limit: budgetUsage.budget.limit })
      throw ApplicationError.Forbidden('Usage limit reached')
    }
    return { budget: budgetUsage.budget.limit }
  }

  const isFree = isFreeModel(model)
  const tokenLimit = course ? getCourseTokenLimit(course.chatInstance) : isFree ? DEFAULT_TOKEN_LIMIT : await getUserTokenLimit(user)
  const usageAllowed = course ? checkCourseUsage(user, course.chatInstance, tokenLimit) : isFree || checkUsage(user, await getUsage(user.id), tokenLimit)

  if (!usageAllowed && !isFree) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  return tokenLimit
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
 * tool module. A quiz answer becomes a text made from the answer and its quiz, instead of its display `content` (keeping
 * its open file).
 */
const toModelHistory = (chatMessages: RunAgentRequest['options']['chatMessages']): ChatMessage[] =>
  chatMessages.map((message, index): ChatMessage => {
    if ('parts' in message) return { role: 'assistant', content: historyMessageToText(message) }
    if (message.role === 'user' && message.quizAnswer) {
      const earlierParts = chatMessages.slice(0, index).flatMap((earlier) => ('parts' in earlier ? [earlier.parts] : []))
      const content = quizAnswerToText(message.quizAnswer, findQuizPart(earlierParts, message.quizAnswer.callId))
      return { role: 'user', content, ...(message.viewerFile ? { viewerFile: message.viewerFile } : {}) }
    }
    return message
  })

/**
 * Azure refuses some prompts with `code: 'content_filter'`; the explanation is shown as the answer. Errors from a
 * model call inside middleware (`wrapModelCall`) arrive wrapped in a `MiddlewareError`, so follow the `cause` chain.
 */
const getContentFilterMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null
  if (!('code' in error) || error.code !== 'content_filter') return getContentFilterMessage(error.cause)
  const innerError = 'error' in error ? (error.error as { message?: string } | undefined) : undefined
  return innerError?.message ?? 'The response was not generated due to the prompt triggering content filters. No further details available.'
}
