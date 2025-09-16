import z from 'zod/v4'
import { ValidModelNameSchema } from '../config'

export const PromptMessagesSchema = z.array(
  z.object({
    role: z.enum(['system', 'assistant', 'user']),
    content: z.string().min(0),
  }),
)

export const PromptUpdateableParamsSchema = z.object({
  name: z.string().min(1).max(255),
  systemMessage: z.string().max(20_000),
  messages: PromptMessagesSchema.optional().default([]),
  hidden: z.boolean().default(false),
  mandatory: z.boolean().default(false),
  ragIndexId: z.number().min(1).optional().nullable(),
  model: ValidModelNameSchema.optional(),
  temperature: z.number().min(0).max(1).optional(),
})

export const PromptCreationParamsSchema = z.intersection(
  PromptUpdateableParamsSchema.extend({
    userId: z.string().min(1),
    messages: PromptMessagesSchema.optional().default([]),
  }),
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('CHAT_INSTANCE'),
      chatInstanceId: z.string().min(1),
    }),
    z.object({
      type: z.literal('PERSONAL'),
    }),
  ]),
)

export type PromptCreationParams = z.input<typeof PromptCreationParamsSchema>
export type PromptEditableParams = z.input<typeof PromptUpdateableParamsSchema>
