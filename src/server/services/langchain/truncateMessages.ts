import getEncoding from "src/server/util/tiktoken";
import { validModels } from "@config";
import { Message } from "@shared/chat";

export const truncateMessages = (modelConfig: typeof validModels[number], messages: Message[]): Message[] => {
  let tokenCount = 0
  const encoding = getEncoding(modelConfig.name)
  const truncatedMessages: Message[] = []

  // First, add all system messages
  messages.forEach((message) => {
    if (message.role === 'system') {
      truncatedMessages.push(message)
      let content: string = ''
      if (typeof message.content === 'string') {
        content = message.content
      }
      const encoded = encoding.encode(content)
      tokenCount += encoded.length
    }
  })

  // Start from the end and work backwards to keep the most recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    let content: string = ''
    if (typeof message.content === 'string') {
      content = message.content
    }
    const encoded = encoding.encode(content)
    const messageTokenCount = encoded.length

    if (tokenCount + messageTokenCount <= modelConfig.context) {
      truncatedMessages.unshift(message) // Add to the start since we're iterating backwards
      tokenCount += messageTokenCount
    } else {
      break // Stop if adding this message would exceed the limit
    }
  }

  encoding.free()

  return truncatedMessages
}
