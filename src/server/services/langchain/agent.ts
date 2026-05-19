import { createAgent } from 'langchain'
import type { StructuredTool } from '@langchain/core/tools'
import { getModelConfig, type ValidModelName } from '@config'
import type { ChatEvent, ChatMessage } from '@shared/chat'
import type { ChatToolDef, ChatToolOutput } from '@shared/tools'
import type { User } from '@shared/user'
import { getAzureChatOpenAI, getVertexModelProvider } from './modelGenerators'
import { ToolResultStore } from './fileSearchResultsStore'

type WriteEventFunction = (data: ChatEvent) => Promise<void>
type AgentUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

type AgentChatResult = {
  tokenCount: number
  inputTokenCount: number
  timeToFirstToken?: number
  tokensPerSecond?: number
  response: string
  toolCalls?: string
}

type PendingToolCalls = Map<string, { name: ChatToolDef['name']; input: ChatToolDef['input'] }>

type StreamRunState = {
  startTS: number
  firstTokenTS?: number
  latestUsage?: AgentUsage
  finalContent: string
  pendingToolCalls: PendingToolCalls
  toolCallNames: Set<string>
}

const serializeUnknownRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

const normalizeUsage = (usage: unknown): AgentUsage | undefined => {
  if (!usage || typeof usage !== 'object') return undefined

  const typedUsage = usage as Record<string, unknown>
  const inputTokens = typeof typedUsage.input_tokens === 'number' ? typedUsage.input_tokens : undefined
  const outputTokens = typeof typedUsage.output_tokens === 'number' ? typedUsage.output_tokens : undefined
  const totalTokens = typeof typedUsage.total_tokens === 'number' ? typedUsage.total_tokens : undefined

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  }
}

const extractMessagesFromAgentUpdate = (update: unknown): Record<string, unknown>[] => {
  const typedUpdate = serializeUnknownRecord(update)
  if (!typedUpdate || !Array.isArray(typedUpdate.messages)) {
    return []
  }

  return typedUpdate.messages.flatMap((message) => {
    const typedMessage = serializeUnknownRecord(message)
    return typedMessage ? [typedMessage] : []
  })
}

const readMessageBlocks = (message: Record<string, unknown>): unknown =>
  message.contentBlocks ?? message.content_blocks ?? message.content

const readMessageType = (message: Record<string, unknown>): string | undefined => {
  const lcKwargs = serializeUnknownRecord(message.lc_kwargs)
  const typed = message.type ?? lcKwargs?.type
  return typeof typed === 'string' ? typed : undefined
}

const readToolCallId = (message: Record<string, unknown>): string | undefined => {
  const direct = message.tool_call_id ?? message.toolCallId
  if (typeof direct === 'string') return direct

  const kwargs = serializeUnknownRecord(message.kwargs)
  return typeof kwargs?.tool_call_id === 'string' ? kwargs.tool_call_id : undefined
}

const readToolArtifact = (message: Record<string, unknown>): ChatToolOutput | undefined => {
  const artifact = message.artifact ?? serializeUnknownRecord(message.kwargs)?.artifact
  return Array.isArray(artifact) ? artifact as ChatToolOutput : undefined
}

const readMessageUsage = (message: Record<string, unknown>): unknown =>
  message.usage_metadata ?? message.usageMetadata ?? message.usage

const extractAgentText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content.reduce(
    (acc, block) => {
      if (!block || typeof block !== 'object' || !('type' in block)) {
        return acc
      }

      const typedBlock = block as Record<string, unknown>

      switch (typedBlock.type) {
        case 'text':
          return acc + (typeof typedBlock.text === 'string' ? typedBlock.text : '')
        default:
          return acc
      }
    },
    '',
  )
}

const getAgentModel = (model: ValidModelName, temperature?: number) => {
  const modelConfig = getModelConfig(model)
  if (!modelConfig) {
    throw new Error(`Invalid model: ${model}`)
  }

  switch (modelConfig.provider) {
    case 'azure':
      return getAzureChatOpenAI({
        name: modelConfig.name,
        temperature,
        streaming: true,
      })
    case 'vertex':
      return getVertexModelProvider(modelConfig.name, temperature)
    default:
      throw new Error(`Model ${model} is not supported by the agent route`)
  }
}

const getAgentConfig = (model: ValidModelName) => {
  const modelConfig = getModelConfig(model)
  if (!modelConfig) {
    throw new Error(`Invalid model: ${model}`)
  }

  if (modelConfig.streamVersion !== 'v4') {
    throw new Error(`Model ${model} is not configured for LangChain 1.0`)
  }

  return modelConfig
}

const buildSystemPrompt = (instructions: string | undefined, systemMessage: string): string =>
  [instructions ?? '', systemMessage]
    .filter((part) => part.trim().length > 0)
    .join('\n\n')

const prepareMessagesForAgent = (messages: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> =>
  messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string'
      ? message.role === 'user' && message.fileContent
        ? `${message.content} ${message.fileContent}`
        : message.content
      : 'this is an image, image rendering not supported yet',
  }))

const buildAgentMessages = (
  promptMessages: { role: string; content: unknown }[],
  chatMessages: ChatMessage[],
) => [
  ...promptMessages
    .filter((message) => typeof message.content === 'string' && (message.role === 'system' || message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({ role: message.role as 'system' | 'user' | 'assistant', content: message.content as string })),
  ...prepareMessagesForAgent(chatMessages),
]

const createStreamState = (): StreamRunState => ({
  startTS: Date.now(),
  finalContent: '',
  pendingToolCalls: new Map<string, { name: ChatToolDef['name']; input: ChatToolDef['input'] }>(),
  toolCallNames: new Set<string>(),
})

const appendStreamedText = async ({
  text,
  state,
  writeEvent,
}: {
  text: string
  state: StreamRunState
  writeEvent: WriteEventFunction
}) => {
  if (text.length === 0) {
    return
  }

  if (!state.firstTokenTS) {
    state.firstTokenTS = Date.now()
  }

  state.finalContent += text
  await writeEvent({
    type: 'writing',
    text,
  })
}

const handleMessageChunk = async ({
  chunk,
  state,
  writeEvent,
}: {
  chunk: unknown
  state: StreamRunState
  writeEvent: WriteEventFunction
}) => {
  const [token] = Array.isArray(chunk) ? chunk as [unknown, unknown] : [undefined, undefined]
  const typedToken = serializeUnknownRecord(token)
  const chunkText = extractAgentText(typedToken?.contentBlocks ?? typedToken?.content_blocks ?? typedToken?.content)

  await appendStreamedText({ text: chunkText, state, writeEvent })
  state.latestUsage = normalizeUsage(readMessageUsage(typedToken ?? {})) ?? state.latestUsage
}

const handleModelStep = async ({
  stepMessages,
  state,
  writeEvent,
}: {
  stepMessages: Record<string, unknown>[]
  state: StreamRunState
  writeEvent: WriteEventFunction
}) => {
  await emitToolCallRequestEvents({
    messages: stepMessages,
    pendingToolCalls: state.pendingToolCalls,
    writeEvent,
  })

  for (const pending of state.pendingToolCalls.values()) {
    state.toolCallNames.add(pending.name)
  }
}

const handleToolStep = async ({
  stepMessages,
  state,
  user,
  writeEvent,
}: {
  stepMessages: Record<string, unknown>[]
  state: StreamRunState
  user: User
  writeEvent: WriteEventFunction
}) => {
  await emitToolResultEvents({
    messages: stepMessages,
    pendingToolCalls: state.pendingToolCalls,
    user,
    writeEvent,
  })
}

const updateStateFromStepMessages = ({
  stepMessages,
  state,
}: {
  stepMessages: Record<string, unknown>[]
  state: StreamRunState
}) => {
  for (const message of stepMessages) {
    const outputText = extractAgentText(readMessageBlocks(message))

    if (state.finalContent.length === 0 && outputText.length > 0) {
      state.finalContent = outputText
    }

    state.latestUsage = normalizeUsage(readMessageUsage(message)) ?? state.latestUsage
  }
}

const handleUpdateChunk = async ({
  chunk,
  state,
  user,
  writeEvent,
}: {
  chunk: unknown
  state: StreamRunState
  user: User
  writeEvent: WriteEventFunction
}) => {
  const typedUpdate = serializeUnknownRecord(chunk)
  if (!typedUpdate) {
    return
  }

  for (const [stepName, stepUpdate] of Object.entries(typedUpdate)) {
    const stepMessages = extractMessagesFromAgentUpdate(stepUpdate)

    if (stepName === 'model') {
      await handleModelStep({ stepMessages, state, writeEvent })
    }

    if (stepName === 'tools') {
      await handleToolStep({ stepMessages, state, user, writeEvent })
    }

    updateStateFromStepMessages({ stepMessages, state })
  }
}

const processAgentStream = async ({
  stream,
  state,
  user,
  writeEvent,
}: {
  stream: AsyncIterable<unknown>
  state: StreamRunState
  user: User
  writeEvent: WriteEventFunction
}) => {
  for await (const event of stream) {
    if (!Array.isArray(event) || event.length !== 2) {
      continue
    }

    const [streamMode, chunk] = event as [string, unknown]

    if (streamMode === 'messages') {
      await handleMessageChunk({ chunk, state, writeEvent })
      continue
    }

    if (streamMode === 'updates') {
      await handleUpdateChunk({ chunk, state, user, writeEvent })
    }
  }
}

const finalizeStreamResult = async ({
  state,
  writeEvent,
}: {
  state: StreamRunState
  writeEvent: WriteEventFunction
}): Promise<AgentChatResult> => {
  if (!state.firstTokenTS && state.finalContent.length > 0) {
    state.firstTokenTS = Date.now()
    await writeEvent({
      type: 'writing',
      text: state.finalContent,
    })
  }

  const timeToFirstToken = state.firstTokenTS ? state.firstTokenTS - state.startTS : undefined
  const outputTokenCount = state.latestUsage?.outputTokens
  const tokenStreamingDuration = state.firstTokenTS ? Math.max(Date.now() - state.firstTokenTS, 1) : undefined

  return {
    tokenCount: outputTokenCount ?? 0,
    inputTokenCount: state.latestUsage?.inputTokens ?? 0,
    timeToFirstToken,
    tokensPerSecond:
      outputTokenCount !== undefined && tokenStreamingDuration
        ? (outputTokenCount / tokenStreamingDuration) * 1000
        : undefined,
    response: state.finalContent,
    toolCalls: state.toolCallNames.size > 0 ? JSON.stringify(Array.from(state.toolCallNames)) : undefined,
  }
}

const emitToolCallRequestEvents = async ({
  messages,
  pendingToolCalls,
  writeEvent,
}: {
  messages: Record<string, unknown>[]
  pendingToolCalls: Map<string, { name: ChatToolDef['name']; input: ChatToolDef['input'] }>
  writeEvent: WriteEventFunction
}) => {
  for (const message of messages) {
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : Array.isArray(message.toolCalls) ? message.toolCalls : []
    for (const rawToolCall of toolCalls) {
      const toolCall = serializeUnknownRecord(rawToolCall)
      if (!toolCall) continue

      const callId = typeof toolCall.id === 'string' ? toolCall.id : undefined
      const toolName = typeof toolCall.name === 'string' ? toolCall.name as ChatToolDef['name'] : undefined
      const input = serializeUnknownRecord(toolCall.args ?? toolCall.input) as ChatToolDef['input'] | undefined

      if (!callId || !toolName || !input || pendingToolCalls.has(callId)) continue

      pendingToolCalls.set(callId, { name: toolName, input })

      await writeEvent({
        type: 'toolCallStatus',
        callId,
        toolName,
        text: `Searching for '${input.query}'`,
        input,
      })
    }
  }
}

const emitToolResultEvents = async ({
  messages,
  pendingToolCalls,
  user,
  writeEvent,
}: {
  messages: Record<string, unknown>[]
  pendingToolCalls: Map<string, { name: ChatToolDef['name']; input: ChatToolDef['input'] }>
  user: User
  writeEvent: WriteEventFunction
}) => {
  for (const message of messages) {
    if (readMessageType(message) !== 'tool') continue

    const callId = readToolCallId(message)
    if (!callId) continue

    const pending = pendingToolCalls.get(callId)
    const artifact = readToolArtifact(message)

    if (!pending || !artifact) continue

    await ToolResultStore.saveResults(callId, artifact, user)

    await writeEvent({
      type: 'toolCallStatus',
      toolName: pending.name,
      callId,
      text: `Completed search for '${pending.input.query}'`,
      input: pending.input,
      result: {
        files: artifact.map((chunk) => ({
          fileName: chunk.metadata.ragFileName,
          score: chunk.score,
        })),
      },
    })

    pendingToolCalls.delete(callId)
  }
}

export const streamAgentChat = async ({
  model,
  temperature,
  systemMessage,
  chatMessages,
  promptMessages = [],
  tools = [],
  user,
  writeEvent,
}: {
  model: ValidModelName
  temperature?: number
  systemMessage: string
  chatMessages: ChatMessage[]
  promptMessages?: { role: string; content: unknown }[]
  tools?: StructuredTool[]
  user: User
  writeEvent: WriteEventFunction
}): Promise<AgentChatResult> => {
  const modelConfig = getAgentConfig(model)
  const systemPrompt = buildSystemPrompt(modelConfig.instructions, systemMessage)
  const messages = buildAgentMessages(promptMessages, chatMessages)
  const state = createStreamState()

  const agent = createAgent({
    name: 'chat_completion_1_0',
    model: getAgentModel(model, temperature) as any,
    tools,
    ...(systemPrompt.length > 0 ? { systemPrompt } : {}),
  })

  const stream = await agent.stream(
    {
      messages,
    },
    {
      streamMode: ['messages', 'updates'],
    },
  )

  await processAgentStream({ stream, state, user, writeEvent })
  return finalizeStreamResult({ state, writeEvent })
}