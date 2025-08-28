import z from 'zod/v4'

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(0).max(400_000),
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
