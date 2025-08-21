import type { ChatToolDef } from './tools'

/**
 * Event emitted when text is added to a chat message
 */
export type WritingEvent = {
  type: 'writing'
  text: string
}

export type CompleteEvent = {
  type: 'complete'
  prevResponseId: string // Not yet sure what to put here in v3
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

export type ChatEvent = WritingEvent | CompleteEvent | ToolCallStatusEvent | ToolCallResultEvent | ErrorEvent
