import getEncoding from "src/server/util/tiktoken";
import { ValidModelName } from "@config";
import { Message } from "@shared/chat";

export const truncateMessages = (modelName: ValidModelName, messages: Message[], contextLimit: number): { truncatedMessages: Message[]; tokenCount: number } => {
  let tokenCount = 0
  const encoding = getEncoding(modelName)
  const truncatedMessages: Message[] = []

  // Start from the end and work backwards to keep the most recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    let content: string = ''
    if (typeof message.content === 'string') {
      content = message.content
    }
    const encoded = encoding.encode(content)
    const messageTokenCount = encoded.length

    if (tokenCount + messageTokenCount <= contextLimit) {
      truncatedMessages.unshift(message) // Add to the start since we're iterating backwards
      tokenCount += messageTokenCount
    } else {
      break // Stop if adding this message would exceed the limit
    }
  }

  encoding.free()

  return { truncatedMessages, tokenCount }
}
