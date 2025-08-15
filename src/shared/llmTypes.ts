export type MessageRole = 'system' | 'user' | 'assistant'

export type ChatRole = 'user' | 'assistant'

export type Message = {
  role: MessageRole
  content: string
}

export type ChatMessage = {
  role: ChatRole
  content: string
}
