import z from 'zod/v4'

export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(0).max(400_000),
})

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(0).max(400_000),
})

export type MessageType = z.infer<typeof MessageSchema>

export const PostStreamSchemaV2 = z.object({
  options: z.object({
    model: z.string(),
    assistantInstructions: z.string().optional(),
    messages: z.array(MessageSchema),
    userConsent: z.boolean().optional(),
    modelTemperature: z.number().min(0).max(2),
    saveConsent: z.boolean().optional(),
    prevResponseId: z.string().optional(),
    courseId: z.string().optional(),
    ragIndexId: z.number().optional().nullable(),
  }),
  courseId: z.string().optional(),
})

export const PostStreamSchemaV3 = z.object({
  options: z.object({
    model: z.string(),
    systemMessage: z.string(),
    chatMessages: z.array(ChatMessageSchema),
    userConsent: z.boolean().optional(),
    modelTemperature: z.number().min(0).max(2),
    saveConsent: z.boolean().optional(),
    prevResponseId: z.string().optional(),
    courseId: z.string().optional(),
    ragIndexId: z.number().optional().nullable(),
  }),
  courseId: z.string().optional(),
})

export type PostStreamBody = z.infer<typeof PostStreamSchemaV2>
