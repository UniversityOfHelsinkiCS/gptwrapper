import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import type { Runnable } from '@langchain/core/runnables'
import type { StructuredTool } from '@langchain/core/tools'
import { concat } from '@langchain/core/utils/stream'
import { AzureChatOpenAI, type ChatOpenAICallOptions } from '@langchain/openai'
import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, type ValidModelName, validModels } from '@config'
import type { ChatEvent, ChatMessage, Message } from '@shared/chat'
import type { ChatToolDef, ChatToolOutput } from '@shared/tools'
import type { User } from '@shared/user'
import { AZURE_API_KEY, AZURE_RESOURCE } from '../../util/config'
import { ToolResultStore } from './fileSearchResultsStore'
import { MockModel } from './MockModel'
import { AiApiWarning, WarningType } from '@shared/aiApi'
import getEncoding from 'src/server/util/tiktoken'
import { calculateUsage } from '../chatInstances/usage'
import { truncateMessages } from './truncateMessages'

export type ChatModel = Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions>

type WriteEventFunction = (data: ChatEvent) => Promise<void>

type ChatTool = StructuredTool<any, any, any, string>

/**
 * Handles the main chat streaming logic.
 * It takes the chat history, model configuration, and a set of tools,
 * and streams the response from the language model, handling tool calls
 * and sending events back to the client.
 *
 * This function can perform two chat turns if the first one results in tool calls.
 *
 * @param model The name of the model to use.
 * @param temperature The temperature for the model's responses.
 * @param systemMessage The system message to prepend to the chat history.
 * @param chatMessages The history of chat messages.
 * @param promptMessages The messages defined in the prompt, will be prepended to the chat history.
 * @param tools The structured tools available to the model.
 * @param writeEvent A function to write chat events to the client.
 * @param user The user initiating the chat.
 * @returns An object containing response statistics and the final response message.
 */
export const streamChat = async ({
  model,
  temperature,
  systemMessage,
  chatMessages,
  promptMessages = [],
  tools = [],
  writeEvent,
  user,
  ignoredWarnings,
}: {
  model: ValidModelName
  temperature?: number
  systemMessage: string
  chatMessages: ChatMessage[]
  promptMessages?: Message[]
  tools?: ChatTool[]
  writeEvent: WriteEventFunction
  user: User,
  ignoredWarnings?: WarningType[],
}): Promise<{
  warnings: AiApiWarning[]
  inputTokenCount: number
} | {
  tokenCount: number
  firstTokenTS: number
  inputTokenCount: number
  tokenStreamingDuration: number
  timeToFirstToken?: number
  tokensPerSecond: number
  response: string
  toolCalls?: string
}> => {
  const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))

  const modelConfig = validModels.find((m) => m.name === model)
  if (!modelConfig) {
    throw new Error(`Invalid model: ${model}`)
  }

  const chatModel = getChatModel(modelConfig, tools, temperature)

  const { messages, warnings, inputTokenCount } = handleWarnings(modelConfig, [
    ...('instructions' in modelConfig ? [{ role: 'system' as const, content: modelConfig.instructions }] : []),
    ...promptMessages,
    {
      role: 'system',
      content: systemMessage,
    },
    ...chatMessages,
  ], ignoredWarnings)

  if (warnings.length > 0) {
    return { warnings, inputTokenCount }
  }

  const result = await chatTurn(chatModel, messages, toolsByName, writeEvent, user)

  // If the model decided to call tools, execute them and send the results back to the model in a second turn.
  if (result.toolCalls.length > 0) {
    const result2 = await chatTurn(chatModel, messages, toolsByName, writeEvent, user)

    return {
      tokenCount: result2.tokenCount,
      firstTokenTS: result2.firstTokenTS,
      inputTokenCount: result2.inputTokenCount,
      tokenStreamingDuration: result2.tokenStreamingDuration,
      timeToFirstToken: result2.timeToFirstToken,
      tokensPerSecond: result2.tokensPerSecond,
      response: (result2.fullOutput?.content ?? '') as string,
      toolCalls: JSON.stringify(result.toolCalls.map((t) => t.name)),
    }
  }

  return {
    tokenCount: result.tokenCount,
    firstTokenTS: result.firstTokenTS,
    inputTokenCount: result.inputTokenCount,
    tokenStreamingDuration: result.tokenStreamingDuration,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
    response: (result.fullOutput?.content ?? '') as string,
  }
}

/**
 * Executes a single turn of the chat.
 * It streams the model's response, handles tool calls, and sends events.
 *
 * @param model The chat model instance.
 * @param messages The messages to send to the model.
 * @param toolsByName A record of available tools, keyed by name.
 * @param writeEvent A function to write chat events to the client.
 * @param user The user for whom the tool results are stored.
 * @returns An object with statistics about the chat turn and any tool calls made.
 */
const chatTurn = async (model: ChatModel, messages: BaseMessageLike[], toolsByName: Record<string, ChatTool>, writeEvent: WriteEventFunction, user: User) => {
  const stream = await safelyStreamMessages(model, messages)

  const startTS = Date.now()
  let firstTokenTS = 0
  let timeToFirstToken: number | undefined
  const toolCallStatuses: Record<string, { status: 'pending' | 'completed' | 'error' }> = {}
  let fullOutput: AIMessageChunk | undefined

  for await (const chunk of stream) {
    if (!timeToFirstToken) {
      firstTokenTS = Date.now()
      timeToFirstToken = firstTokenTS - startTS
    }

    for (const toolCall of chunk.tool_call_chunks ?? []) {
      const id = toolCall.id
      if (id && !toolCallStatuses[id]) {
        toolCallStatuses[id] = {
          status: 'pending',
        }
        await writeEvent({
          type: 'toolCallStatus',
          toolName: toolCall.name as ChatToolDef['name'],
          callId: id,
          text: 'Searching',
        })
      }
    }

    const text = chunk.content as string
    if (text.length > 0) {
      await writeEvent({
        type: 'writing',
        text,
      })
    }

    // Append the chunk to the full response.
    fullOutput = fullOutput !== undefined ? concat(fullOutput, chunk) : chunk
  }

  // Add the assistant's full response to the message history.
  messages.push(fullOutput as AIMessageChunk)

  const toolCalls = fullOutput?.tool_calls ?? []
  for (const toolCall of toolCalls) {
    const tool = toolsByName[toolCall.name]
    const id = toolCall.id
    const name = toolCall.name as ChatToolDef['name']
    const input = toolCall.args as ChatToolDef['input']
    if (id && tool) {
      await writeEvent({
        type: 'toolCallStatus',
        toolName: name,
        callId: id,
        text: `Searching for '${input.query}'`,
        input,
      })
      const result = await tool.invoke(toolCall)
      const artifact = result.artifact as ChatToolOutput
      await ToolResultStore.saveResults(id, artifact, user)
      // Add the tool's output to the message history for the next turn.
      messages.push(result)
      toolCallStatuses[id] = {
        status: 'completed',
      }
      await writeEvent({
        type: 'toolCallStatus',
        toolName: name,
        callId: id,
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

  // Calculate statistics about the response generation.
  const tokenCount = fullOutput?.usage_metadata?.output_tokens ?? 0
  const inputTokenCount = fullOutput?.usage_metadata?.input_tokens ?? 0
  const tokenStreamingDuration = Date.now() - firstTokenTS

  return {
    tokenCount,
    firstTokenTS,
    timeToFirstToken,
    tokensPerSecond: (tokenCount / tokenStreamingDuration) * 1000,
    inputTokenCount,
    tokenStreamingDuration,
    toolCalls,
    fullOutput,
  }
}


/**
 * Gets a chat model instance based on the provided configuration.
 * Can be a MockModel for testing or an AzureChatOpenAI model.
 * @param modelConfig The configuration for the model.
 * @param tools The structured tools the model can use.
 * @param temperature The temperature for the model's responses.
 * @returns A chat model instance.
 */
const getChatModel = (modelConfig: (typeof validModels)[number], tools: StructuredTool[], temperature?: number): ChatModel => {
  const chatModel =
    modelConfig.name === 'mock'
      ? new MockModel({ tools, temperature })
      : new AzureChatOpenAI<ChatOpenAICallOptions>({
          model: modelConfig.name,
          azureOpenAIApiKey: AZURE_API_KEY,
          azureOpenAIApiVersion: '2024-10-21',
          azureOpenAIApiDeploymentName: modelConfig.name, // In Azure, always use the acual model name as the deployment name
          azureOpenAIApiInstanceName: AZURE_RESOURCE,
          temperature: 'temperature' in modelConfig ? modelConfig.temperature : temperature, // If model config specifies a temperature, use it; otherwise, use the user supplied temperature.
          reasoning: {
            effort: 'minimal',
            summary: null,
            generate_summary: null,
          },
          streaming: true,
        }).bindTools(tools) // Make tools available to the model.

  return chatModel
}

const handleWarnings = (modelConfig: (typeof validModels)[number], messages: Message[], ignoredWarnings?: WarningType[]): { warnings: AiApiWarning[], messages: Message[], inputTokenCount: number } => {
  const encoding = getEncoding(modelConfig.name)
  const tokenCount = calculateUsage(messages, encoding)
  encoding.free()

  let messagesToReturn = messages
  const warnings: AiApiWarning[] = []

  // Warn about usage if over 10% of limit
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  const isFreeModel = modelConfig.name === FREE_MODEL

  if (!isFreeModel && tokenUsagePercentage > 10 && !ignoredWarnings?.includes('usage')) {
    warnings.push({
      warningType: 'usage',
      warning: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
      canIgnore: true,
    })
  }

  // Check context limit
  const contextLimit = modelConfig.context

  if (tokenCount > contextLimit) {

    if (!ignoredWarnings?.includes('contextLimit')) {
      warnings.push({
        warningType: 'contextLimit',
        warning: `The conversation exceeds the context limit of ${contextLimit} tokens for the selected model. Your conversation has ${tokenCount} tokens. Clicking continue will truncate the oldest messages. It is recommended to start a new conversation.`,
        contextLimit,
        tokenCount,
        canIgnore: true,
      })
    } else {
      messagesToReturn = truncateMessages(modelConfig, messages)
    }
  }

  return { warnings, messages: messagesToReturn, inputTokenCount: tokenCount }
}

const safelyStreamMessages = async (model: ChatModel, messages: BaseMessageLike[]) => {
  try {
    return await model.stream(messages)
  } catch (error) {
    if (error instanceof Error) {
      // Handle API errors specifically.
      // Handle content filter:
      if ("code" in error && error.code === 'content_filter') {
        const innerError = "error" in error ? error.error as { message: string } : null

        const extraAzureInfo = innerError?.message ??
           'The response was not generated due to the prompt triggering content filters. No further details available.'

        return [new AIMessageChunk({
          content: extraAzureInfo,
        })]
      }
    }

    throw error
  }
}
