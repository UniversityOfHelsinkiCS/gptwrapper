import getEncoding from 'src/server/util/tiktoken'
import { inputLimit, validModels } from '@config'
import { Message, readMessageContent } from '@shared/chat'
import { withQuotes } from '../agent/quotes'

export const truncateMessages = (modelConfig: (typeof validModels)[number], messages: Message[]): Message[] => {
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
    // Include the open file, quotes and fileContent in token calculation for user messages
    const withQuoted = message.role === 'user' ? withQuotes(text, message.quotes, message.viewerFile) : text
    const content = message.role === 'user' && message.fileContent ? `${withQuoted} ${message.fileContent}` : withQuoted
    const encoded = encoding.encode(content)
    const messageTokenCount = encoded.length

    if (tokenCount + messageTokenCount <= inputLimit(modelConfig)) {
      truncatedMessages.unshift(message) // Add to the start since we're iterating backwards
      tokenCount += messageTokenCount
    } else {
      break // Stop if adding this message would exceed the limit
    }
  }

  return truncatedMessages
}
