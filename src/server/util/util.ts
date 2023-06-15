import { ChatCompletionRequestMessage } from 'openai'

/**
 * Filter out messages in a long conversation to save costs
 * and to stay within context limit.
 * Always keep system messages and last 10 messages
 */
export const getMessageContext = (
  messages: ChatCompletionRequestMessage[]
): ChatCompletionRequestMessage[] => {
  const systemMessages = messages.filter((message) => message.role === 'system')
  const otherMessages = messages.filter((message) => message.role !== 'system')

  const latestMessages = otherMessages.slice(-10)

  return systemMessages.concat(latestMessages)
}
