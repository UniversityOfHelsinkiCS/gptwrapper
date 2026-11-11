import z from 'zod/v4'
import { ValidModelNameSchema } from '../config'
import { type QuizAnswer, QuizAnswerSchema } from './quiz'

export type ToolCallInput = {
  query?: string
  [key: string]: unknown
}

export type ToolCallResult = {
  /** `excerpt`: the start of the matching chunk (document_search on v4), used in the history summary. */
  files: { fileName: string; score?: number; excerpt?: string }[]
}

type ToolCallStatusEvent = {
  type: 'toolCallStatus'
  callId: string
  toolName: string
  text: string
  input?: ToolCallInput
}

/** A finished tool call as saved in `AssistantMessage.toolCalls` by the old (v3) stream. Old saved messages are migrated to parts from this. */
export type ToolCallResultEvent = ToolCallStatusEvent & {
  input: ToolCallInput
  result: ToolCallResult
}

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
  /** Set when the message is the student's answer to a quiz. `content` is then only for display and export; the server gives the model a text made from this. */
  quizAnswer?: QuizAnswer
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

export const hasFileResults = (toolResults: ToolCallResultEvent[]): boolean => toolResults.some((toolResult) => (toolResult.result?.files ?? []).length > 0)

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

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string().min(0).max(1_200_000), MessageContentArraySchema]),
  attachements: z.union([z.string(), z.array(z.string())]).optional(),
  fileContent: z.string().optional(),
  quizAnswer: QuizAnswerSchema.optional(),
})
