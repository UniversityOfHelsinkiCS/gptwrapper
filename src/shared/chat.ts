import z from 'zod/v4'
import type { ChatToolDef } from './tools'
import { ValidModelNameSchema } from '../config'
import { WarningTypes } from './aiApi'

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

export type ImageUrl = {
  url: string
}
export type MessageContent = {
  type: string
  image_url: ImageUrl
}

export type SystemMessage = {
  role: 'system'
  content: MessageContent[] | string
}

export type UserMessage = {
  role: 'user'
  content: MessageContent[] | string
  attachments?: string
}

export const readMessageContent = (msg: UserMessage | AssistantMessage): string => {
  if(Array.isArray(msg.content)){
    return "this is an image, image rendering not supported yet"
  }
  else{
    return msg.content.toString()
  }
}

export type AssistantMessage = {
  role: 'assistant'
  content: MessageContent[] | string
  error?: string
  toolCalls?: Record<string, ToolCallResultEvent>
  generationInfo?: MessageGenerationInfo
}

export type Message = SystemMessage | UserMessage | AssistantMessage

export type ChatMessage = UserMessage | AssistantMessage

export const MessageGenerationInfoSchema = z.object({
  // May be overridden by prompt
  model: ValidModelNameSchema,
  // May be overridden by prompt
  temperature: z.number().min(0).max(1).optional().nullable(),
  promptInfo: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('saved'),
      id: z.string(),
      name: z.string(),
      systemMessage: z.string().optional(),
      model: ValidModelNameSchema.optional().nullable(),
      temperature: z.number().min(0).max(1).optional().nullable(),
    }),
    z.object({
      type: z.literal('custom'),
      systemMessage: z.string(),
    }),
  ]),
})

export type MessageGenerationInfo = z.Infer<typeof MessageGenerationInfoSchema>


const MessageContentSchema = z.object({
  type: z.string(),
  image_url: z.object({
    url: z.string()
  })
}) 
export const MessageContentArraySchema = z.union([z.string(), z.array(MessageContentSchema)])
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string().min(0).max(1_200_000),
    MessageContentArraySchema,
  ]),
})

export const PostStreamSchemaV3 = z.object({
  options: z.object({
    chatMessages: z.array(ChatMessageSchema),
    generationInfo: MessageGenerationInfoSchema,
    ignoredWarnings: WarningTypes.array().optional(),
    saveConsent: z.boolean().optional(),
    courseId: z.string().optional(),
  }),
  courseId: z.string().optional(),
})

export type PostStreamSchemaV3Type = z.input<typeof PostStreamSchemaV3>
