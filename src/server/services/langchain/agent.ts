import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage, type BaseMessageLike } from '@langchain/core/messages'
import type { Runnable } from '@langchain/core/runnables'
import type { StructuredTool } from '@langchain/core/tools'
import { concat } from '@langchain/core/utils/stream'
import { getModelConfig, ModelProvider, type ValidModelName } from '@config'
import type { ChatEvent, ChatMessage } from '@shared/chat'
import type { RagChunk } from '@shared/rag'
import { getAzureChatOpenAI, getVertexModelProvider } from './modelGenerators'

type WriteEventFunction = (data: ChatEvent) => Promise<void>
type ChatModel = Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions>
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

type V4ToolInput = {
  query: string
}

type V4ToolCall = {
  id?: string
  name: string
  args: V4ToolInput
}

type NormalizedToolResult = {
  content: string
  artifact?: unknown
}

const v4DebugEnabled = process.env.V4_DEBUG === 'true'

const previewText = (value: string, maxLength = 200): string => (value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`)

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

const safelyStreamMessages = async (model: ChatModel, messages: BaseMessageLike[]) => {
  try {
    return await model.stream(messages)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'content_filter') {
      const innerError = 'error' in error ? (error.error as { message?: string }) : null

      return [new AIMessageChunk({ content: innerError?.message ?? 'The response was blocked by content filtering.' })]
    }

    throw error
  }
}

const getAgentModel = (model: ValidModelName) => {
  const modelConfig = getModelConfig(model)
  if (!modelConfig) {
    throw new Error(`Invalid model: ${model}`)
  }

  switch (modelConfig.provider) {
    case ModelProvider.Azure:
      return getAzureChatOpenAI(modelConfig.name)
    case ModelProvider.Vertex:
      return getVertexModelProvider(modelConfig.name)
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
  [instructions ?? '', systemMessage].filter((part) => part.trim().length > 0).join('\n\n')

const prepareMessagesForAgent = (messages: ChatMessage[]): BaseMessageLike[] =>
  messages.map((message) => {
    const content =
      typeof message.content === 'string'
        ? message.role === 'user' && message.fileContent
          ? `${message.content} ${message.fileContent}`
          : message.content
        : 'this is an image, image rendering not supported yet'

    return message.role === 'user' ? new HumanMessage(content) : new AIMessage(content)
  })

const buildAgentMessages = (promptMessages: { role: string; content: unknown }[], chatMessages: ChatMessage[]): BaseMessageLike[] => [
  ...promptMessages
    .filter((message) => typeof message.content === 'string' && (message.role === 'system' || message.role === 'user' || message.role === 'assistant'))
    .map((message) => {
      const content = message.content as string

      if (message.role === 'system') {
        return new SystemMessage(content)
      }

      if (message.role === 'user') {
        return new HumanMessage(content)
      }

      return new AIMessage(content)
    }),
  ...prepareMessagesForAgent(chatMessages),
]

const createStreamState = (): StreamRunState => ({
  startTS: Date.now(),
  finalContent: '',
  toolCallNames: new Set<string>(),
})

const appendStreamedText = async ({ text, state, writeEvent }: { text: string; state: StreamRunState; writeEvent: WriteEventFunction }) => {
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

const streamModelTurn = async ({
  model,
  messages,
  state,
  writeEvent,
  emitText,
}: {
  model: ChatModel
  messages: BaseMessageLike[]
  state: StreamRunState
  writeEvent: WriteEventFunction
  emitText: boolean
}) => {
  const stream = await safelyStreamMessages(model, messages)
  let fullOutput: AIMessageChunk | undefined
  let bufferedText = ''

  for await (const chunk of stream) {
    const chunkText = extractAgentText(chunk.content)
    bufferedText += chunkText

    if (emitText && chunkText.length > 0) {
      await appendStreamedText({ text: chunkText, state, writeEvent })
    }

    fullOutput = fullOutput ? concat(fullOutput, chunk) : chunk
  }

  state.latestUsage = normalizeUsage(fullOutput?.usage_metadata) ?? state.latestUsage

  return {
    bufferedText,
    fullOutput,
    toolCalls: (fullOutput?.tool_calls ?? []) as V4ToolCall[],
  }
}

const buildToolCallMessage = (output: AIMessageChunk) =>
  new AIMessage({
    content: extractAgentText(output.content),
    tool_calls: output.tool_calls ?? [],
  })

const isRagChunkArray = (value: unknown): value is RagChunk[] =>
  Array.isArray(value) &&
  value.every((chunk) => {
    const typedChunk = readUnknownRecord(chunk)
    const metadata = readUnknownRecord(typedChunk?.metadata)

    return typeof typedChunk?.content === 'string' && typeof metadata?.ragFileName === 'string'
  })

const normalizeToolResult = (result: unknown): NormalizedToolResult => {
  const typedResult = readUnknownRecord(result)

  if (typedResult && typeof typedResult.content === 'string') {
    return {
      content: typedResult.content,
      artifact: typedResult.artifact,
    }
  }

  if (Array.isArray(result) && result.length === 2 && typeof result[0] === 'string') {
    return {
      content: result[0],
      artifact: result[1],
    }
  }

  return {
    content: typeof result === 'string' ? result : JSON.stringify(result),
  }
}

const getToolStatusText = ({ toolName, input, status }: { toolName: string; input: V4ToolInput; status: 'started' | 'completed' }) => {
  if (toolName === 'document_search') {
    return status === 'started' ? `Searching source materials for '${input.query}'` : `Completed source material search for '${input.query}'`
  }

  if (toolName === 'weather') {
    return status === 'started' ? `Checking weather for '${input.query}'` : `Completed weather lookup for '${input.query}'`
  }

  return status === 'started' ? `Calling ${toolName}` : `Completed ${toolName}`
}

const executeToolCalls = async ({
  messages,
  state,
  toolCalls,
  tools,
  writeEvent,
}: {
  messages: BaseMessageLike[]
  state: StreamRunState
  toolCalls: V4ToolCall[]
  tools: StructuredTool[]
  writeEvent: WriteEventFunction
}) => {
  const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))

  for (const toolCall of toolCalls) {
    const tool = toolsByName[toolCall.name]
    const callId = toolCall.id ?? toolCall.name

    if (!tool) {
      continue
    }

    state.toolCallNames.add(toolCall.name)

    debugV4('tool call streamed', {
      callId,
      toolName: toolCall.name,
      query: toolCall.args?.query,
    })

    await writeEvent({
      type: 'toolCallStatus',
      callId,
      toolName: toolCall.name,
      text: getToolStatusText({ toolName: toolCall.name, input: toolCall.args, status: 'started' }),
      input: toolCall.args,
    })

    //Invokes the tool and adds the result back as a regular message.
    //Result is later seen by the agent as part of the conversation
    const result = await tool.invoke(toolCall)
    const { content, artifact } = normalizeToolResult(result)
    messages.push(new ToolMessage(content, callId, toolCall.name))

    debugV4('tool call completed', {
      callId,
      toolName: toolCall.name,
      query: toolCall.args.query,
    })

    await writeEvent({
      type: 'toolCallStatus',
      toolName: toolCall.name,
      callId,
      text: getToolStatusText({ toolName: toolCall.name, input: toolCall.args, status: 'completed' }),
      input: toolCall.args,
      ...(isRagChunkArray(artifact)
        ? {
            result: {
              files: artifact.map((chunk) => ({
                fileName: chunk.metadata.ragFileName,
                score: chunk.score,
              })),
            },
          }
        : {}),
    })
  }
}

const finalizeStreamResult = async ({ state, writeEvent }: { state: StreamRunState; writeEvent: WriteEventFunction }): Promise<AgentChatResult> => {
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
    tokensPerSecond: outputTokenCount !== undefined && tokenStreamingDuration ? (outputTokenCount / tokenStreamingDuration) * 1000 : undefined,
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
  writeEvent,
}: {
  model: ValidModelName
  temperature?: number
  systemMessage: string
  chatMessages: ChatMessage[]
  promptMessages?: { role: string; content: unknown }[]
  tools?: StructuredTool[]
  writeEvent: WriteEventFunction
}): Promise<AgentChatResult> => {
  const modelConfig = getAgentConfig(model)
  const systemPrompt = buildSystemPrompt(modelConfig.instructions, systemMessage)
  const messages: BaseMessageLike[] = buildAgentMessages(promptMessages, chatMessages)
  const state = createStreamState()

  debugV4('starting agent stream', {
    model,
    temperature,
    systemPromptLength: systemPrompt.length,
    messageCount: messages.length,
    toolCount: tools.length,
  })

  const baseModel = getAgentModel(model, temperature)
  const firstTurnModel = tools.length > 0 ? ((baseModel as any).bindTools(tools) as ChatModel) : baseModel
  const firstTurnMessages = systemPrompt.length > 0 ? [new SystemMessage(systemPrompt), ...messages] : messages

  const firstTurn = await streamModelTurn({
    model: firstTurnModel,
    messages: firstTurnMessages,
    state,
    writeEvent,
    emitText: false,
  })

  if (!firstTurn.fullOutput) {
    return finalizeStreamResult({ state, writeEvent })
  }

  if (firstTurn.toolCalls.length === 0) {
    if (firstTurn.bufferedText.length > 0) {
      await appendStreamedText({ text: firstTurn.bufferedText, state, writeEvent })
    }

    return finalizeStreamResult({ state, writeEvent })
  }

  const secondTurnMessages: BaseMessageLike[] = [...firstTurnMessages, buildToolCallMessage(firstTurn.fullOutput)]

  await executeToolCalls({
    messages: secondTurnMessages,
    state,
    toolCalls: firstTurn.toolCalls,
    tools,
    writeEvent,
  })

  await streamModelTurn({
    model: baseModel,
    messages: secondTurnMessages,
    state,
    writeEvent,
    emitText: true,
  })

  return finalizeStreamResult({ state, writeEvent })
}
