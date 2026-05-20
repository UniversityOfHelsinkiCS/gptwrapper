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

type StreamRunState = {
  startTS: number
  firstTokenTS?: number
  latestUsage?: AgentUsage
  finalContent: string
  toolCallNames: Set<string>
}

const v4DebugEnabled = true

const previewText = (value: string, maxLength = 200): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`

const debugV4 = (message: string, data?: Record<string, unknown>) => {
  if (!v4DebugEnabled) {
    return
  }

  console.log(`[v4] ${message}`, data ?? {})
}

const readUnknownRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
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
  const typedUpdate = readUnknownRecord(update)
  if (!typedUpdate || !Array.isArray(typedUpdate.messages)) {
    return []
  }

  return typedUpdate.messages.flatMap((message) => {
    const typedMessage = readUnknownRecord(message)
    return typedMessage ? [typedMessage] : []
  })
}

const readMessageBlocks = (message: Record<string, unknown>): unknown =>
  message.contentBlocks ?? message.content_blocks ?? message.content

const readMessageUsage = (message: Record<string, unknown>): unknown =>
  message.usage_metadata ?? message.usageMetadata ?? message.usage

const extractAgentText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content.reduce((acc, block) => acc + extractAgentText(block), '')
  }

  const typedContent = readUnknownRecord(content)
  if (!typedContent) {
    return ''
  }

  if (typeof typedContent.text === 'string') {
    return typedContent.text
  }

  if ('content' in typedContent) {
    return extractAgentText(typedContent.content)
  }

  if ('contentBlocks' in typedContent || 'content_blocks' in typedContent) {
    return extractAgentText(typedContent.contentBlocks ?? typedContent.content_blocks)
  }

  return ''
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
  debugV4('streamed text appended', {
    textLength: text.length,
    textPreview: previewText(text),
    accumulatedLength: state.finalContent.length,
  })
  await writeEvent({
    type: 'writing',
    text,
  })
}

const hydrateStateFromOutput = ({
  output,
  state,
}: {
  output: unknown
  state: StreamRunState
}) => {
  const typedOutput = readUnknownRecord(output)
  const outputMessages = typedOutput ? extractMessagesFromAgentUpdate(typedOutput) : []

  for (const message of outputMessages) {
    const outputText = extractAgentText(readMessageBlocks(message))

    if (outputText.length > 0) {
      state.finalContent = outputText
    }

    state.latestUsage = normalizeUsage(readMessageUsage(message)) ?? state.latestUsage
  }

  if (state.finalContent.length > 0) {
    debugV4('final content hydrated from run output', {
      outputTextLength: state.finalContent.length,
      outputTextPreview: previewText(state.finalContent),
    })
  }
}

const streamAgentMessages = async ({
  run,
  state,
  writeEvent,
}: {
  run: Awaited<ReturnType<ReturnType<typeof createAgent>['streamEvents']>>
  state: StreamRunState
  writeEvent: WriteEventFunction
}) => {
  for await (const message of run.messages) {
    debugV4('agent message stream opened', {
      node: message.node,
      namespaceDepth: message.namespace.length,
    })

    for await (const token of message.text) {
      await appendStreamedText({ text: token, state, writeEvent })
    }

    state.latestUsage = normalizeUsage(await message.usage) ?? state.latestUsage
  }
}


// this is when rag toolcalls happen, to track the progress
const streamAgentToolCalls = async ({
  run,
  state,
  user,
  writeEvent,
}: {
  run: Awaited<ReturnType<ReturnType<typeof createAgent>['streamEvents']>>
  state: StreamRunState
  user: User
  writeEvent: WriteEventFunction
}) => {
  for await (const call of run.toolCalls) {
    const input = readUnknownRecord(call.input) as ChatToolDef['input'] | undefined
    const toolName = call.name as ChatToolDef['name']

    state.toolCallNames.add(toolName)

    debugV4('tool call streamed', {
      callId: call.callId,
      toolName,
      query: input?.query,
    })

    if (input) {
      await writeEvent({
        type: 'toolCallStatus',
        callId: call.callId,
        toolName,
        text: `Searching for '${input.query}'`,
        input,
      })
    }

    const status = await call.status
    if (status !== 'finished') {
      continue
    }

    const output = await call.output
    if (!input || !Array.isArray(output)) {
      continue
    }

    const artifact = output as ChatToolOutput
    await ToolResultStore.saveResults(call.callId, artifact, user)

    debugV4('tool call completed', {
      callId: call.callId,
      toolName,
      query: input.query,
      resultCount: artifact.length,
    })

    await writeEvent({
      type: 'toolCallStatus',
      toolName,
      callId: call.callId,
      text: `Completed search for '${input.query}'`,
      input,
      result: {
        files: artifact.map((chunk) => ({
          fileName: chunk.metadata.ragFileName,
          score: chunk.score,
        })),
      },
    })
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

  debugV4('finalizing stream result', {
    responseLength: state.finalContent.length,
    responsePreview: previewText(state.finalContent),
    inputTokens: state.latestUsage?.inputTokens,
    outputTokens: outputTokenCount,
    toolCallCount: state.toolCallNames.size,
  })

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

  debugV4('starting agent stream', {
    model,
    temperature,
    systemPromptLength: systemPrompt.length,
    messageCount: messages.length,
    toolCount: tools.length,
  })

  const agent = createAgent({
    name: 'chat_completion_1_0',
    model: getAgentModel(model, temperature) as any,
    tools,
    ...(systemPrompt.length > 0 ? { systemPrompt } : {}),
  })

  const run = await agent.streamEvents(
    {
      messages,
    },
    {
      version: 'v3',
    },
  )

  const [output] = await Promise.all([
    run.output,
    streamAgentMessages({ run, state, writeEvent }),
    streamAgentToolCalls({ run, state, user, writeEvent }),
  ])

  hydrateStateFromOutput({ output, state })
  return finalizeStreamResult({ state, writeEvent })
}