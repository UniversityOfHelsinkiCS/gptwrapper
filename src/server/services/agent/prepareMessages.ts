import { DEFAULT_TOKEN_LIMIT, inputLimit, isFreeModel, type ModelConfig, validModels } from '@config'
import type { AiApiWarning, WarningType } from '@shared/aiApi'
import type { ChatMessage, Message } from '@shared/chat'
import getEncoding from '../../util/tiktoken'
import { calculateUsage } from '../chatInstances/usage'
import { truncateMessages } from '../langchain/truncateMessages'

/**
 * Prepares chat messages for the LLM by combining message content with file content
 */
export const prepareMessagesForLLM = (messages: ChatMessage[]): ChatMessage[] => {
  return messages.map((msg) => {
    if (msg.role === 'user' && msg.fileContent && typeof msg.content === 'string') {
      // Combine the user's message with the file content for the LLM
      return {
        ...msg,
        content: `${msg.content} ${msg.fileContent}`,
      }
    }
    return msg
  })
}

export const modelConfigHasInstructions = (modelConfig: ModelConfig): modelConfig is ModelConfig & { instructions: string } =>
  'instructions' in modelConfig && typeof modelConfig.instructions === 'string'

/**
 * What the usage warning compares the input with: the weekly token limit (`USAGE_ENFORCEMENT=tokens`), or the weekly
 * budget limit in € (`cost`).
 */
export type UsageWarningLimit = number | { budget: number }

/** Percentage of the weekly limit the input is estimated to use, or null when the model is exempt (free under tokens). */
const usagePercentage = (modelConfig: (typeof validModels)[number], tokenCount: number, limit: UsageWarningLimit): number | null => {
  if (typeof limit === 'object') {
    // Only uncached input at its price: the cheapest estimate that still scales with the conversation.
    const estimatedCost = (tokenCount * modelConfig.price.input) / 1_000_000
    return Math.round((estimatedCost / limit.budget) * 100)
  }
  if (isFreeModel(modelConfig.name)) return null
  return Math.round((tokenCount / limit) * 100)
}

export const handleWarnings = (
  modelConfig: (typeof validModels)[number],
  messages: Message[],
  ignoredWarnings?: WarningType[],
  limit: UsageWarningLimit = DEFAULT_TOKEN_LIMIT,
): { warnings: AiApiWarning[]; messages: Message[]; inputTokenCount: number } => {
  const encoding = getEncoding(modelConfig.name)
  const tokenCount = calculateUsage(messages, encoding)

  let messagesToReturn = messages
  const warnings: AiApiWarning[] = []

  // Warn about usage if over 10% of the weekly limit
  const tokenUsagePercentage = usagePercentage(modelConfig, tokenCount, limit)

  if (tokenUsagePercentage !== null && tokenUsagePercentage > 10 && !ignoredWarnings?.includes('usage')) {
    warnings.push({
      warningType: 'usage',
      warning: `You are about to use ${tokenUsagePercentage}% of your weekly CurreChat usage`,
      canIgnore: true,
      tokenUsagePercentage,
    })
  }

  // Check context limit
  const contextLimit = inputLimit(modelConfig)

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
