import z from 'zod/v4'
import { ValidModelNameSchema } from '../config'
import { WarningTypes } from './aiApi'

/**
 * Event emitted when text is added to a chat message
 */
export type WritingEvent = {
  type: 'writing'
  text: string
}

export type ToolCallInput = {
  query?: string
  [key: string]: unknown
}

export type ToolCallResult = {
  files: { fileName: string; score?: number }[]
}

export type ToolCallStatusEvent = {
  type: 'toolCallStatus'
  callId: string
  toolName: string
  text: string
  input?: ToolCallInput
}

export type ToolCallResultEvent = ToolCallStatusEvent & {
  input: ToolCallInput
  result: ToolCallResult
}

export type ErrorEvent = {
  type: 'error'
  error: string
}

/**
 * Event emitted when a long-running operation is in progress (e.g., file parsing)
 * Used to keep the connection alive during processing
 */
export type ProcessingEvent = {
  type: 'processing'
  message: string
}

export type ChatEvent = WritingEvent | ToolCallStatusEvent | ToolCallResultEvent | ErrorEvent | ProcessingEvent

const TextContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})
const ImageContentPartSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z.string(),
  }),
})
const MessageContentSchema = z.discriminatedUnion('type', [TextContentPartSchema, ImageContentPartSchema])

export type MessageContent = z.Infer<typeof MessageContentSchema>

export type SystemMessage = {
  role: 'system'
  content: MessageContent[] | string
}

export type UserMessage = {
  role: 'user'
  content: MessageContent[] | string
  attachments?: string
  fileContent?: string
}

export const readMessageContent = (msg: Pick<Message, 'content'>): string => {
  if (!Array.isArray(msg.content)) return msg.content
  return msg.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
}

/**
 * Returns the image urls (data urls base64) of a message
 */
export const readMessageImages = (msg: Pick<Message, 'content'>): string[] => {
  if (!Array.isArray(msg.content)) return []
  return msg.content.filter((part) => part.type === 'image_url').map((part) => part.image_url.url)
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
  model: ValidModelNameSchema,
  temperature: z.number().min(0).max(1).optional().nullable(),
  promptInfo: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('saved'),
      id: z.string(),
      name: z.string(),
      systemMessage: z.string().optional(),
    }),
    z.object({
      type: z.literal('custom'),
      systemMessage: z.string(),
    }),
  ]),
})

export type MessageGenerationInfo = z.Infer<typeof MessageGenerationInfoSchema>

export const MessageContentArraySchema = z.union([z.string(), z.array(MessageContentSchema)])

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string().min(0).max(1_200_000), MessageContentArraySchema]),
  attachements: z.union([z.string(), z.array(z.string())]).optional(),
  fileContent: z.string().optional(),
})

export const PostStreamSchemaV3 = z.object({
  options: z.object({
    chatMessages: z.array(ChatMessageSchema),
    generationInfo: MessageGenerationInfoSchema,
    ignoredWarnings: WarningTypes.array().optional(),
    courseId: z.string().optional(),
  }),
  courseId: z.string().optional(),
})

export type PostStreamSchemaV3Type = z.input<typeof PostStreamSchemaV3>
