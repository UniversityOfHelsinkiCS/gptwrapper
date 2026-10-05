import getEncoding from "src/server/util/tiktoken";
import { validModels } from "@config";
import { Message, readMessageContent } from "@shared/chat";

export const truncateMessages = (modelConfig: typeof validModels[number], messages: Message[]): Message[] => {
  let tokenCount = 0
  const encoding = getEncoding(modelConfig.name)
  const truncatedMessages: Message[] = []

  // First, add all system messages
  messages.forEach((message) => {
    if (message.role === 'system') {
      truncatedMessages.push(message)
      const encoded = encoding.encode(readMessageContent(message))
      tokenCount += encoded.length
    }
  })

  // Start from the end and work backwards to keep the most recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const text = readMessageContent(message)
    // Include fileContent in token calculation for user messages
    const content = message.role === 'user' && message.fileContent ? `${text} ${message.fileContent}` : text
    const encoded = encoding.encode(content)
    const messageTokenCount = encoded.length

    if (tokenCount + messageTokenCount <= modelConfig.context) {
      truncatedMessages.unshift(message) // Add to the start since we're iterating backwards
      tokenCount += messageTokenCount
    } else {
      break // Stop if adding this message would exceed the limit
    }
  }

  return truncatedMessages
}
