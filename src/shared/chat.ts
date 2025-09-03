import type { ChatToolDef } from './tools'

/**
 * Event emitted when text is added to a chat message
 */
export type WritingEvent = {
  type: 'writing'
  text: string
}

export type ToolCallStatusEvent = {
  type: 'toolCallStatus'
  callId: string
  toolName: ChatToolDef['name']
  text: string
  input?: ChatToolDef['input']
}

export type ToolCallResultEvent = ToolCallStatusEvent & {
  input: ChatToolDef['input']
  result: ChatToolDef['result']
}

export type ErrorEvent = {
  type: 'error'
  error: string
}

export type ChatEvent = WritingEvent | ToolCallStatusEvent | ToolCallResultEvent | ErrorEvent

export type SystemMessage = {
  role: 'system'
  content: string
}

export type UserMessage = {
  role: 'user'
  content: string
  attachments?: string
}

export type AssistantMessage = {
  role: 'assistant'
  content: string
  error?: string
  toolCalls?: Record<string, ToolCallResultEvent>
  promptInfo?: MessagePromptInfo
}

export type Message = SystemMessage | UserMessage | AssistantMessage

export type MessageRole = Message['role']

export type ChatMessage = UserMessage | AssistantMessage

export type ChatRole = ChatMessage['role']

export type MessagePromptInfo =
  | {
      type: 'saved'
      id: string
      name: string
      systemMessage?: string
    }
  | {
      type: 'custom'
      systemMessage: string
    }
