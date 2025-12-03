import z from 'zod/v4'
import { ValidModelNameSchema } from '../config'
import { MessageContentArraySchema } from './chat'

export const PromptMessagesSchema = z.array(
  z.object({
    role: z.enum(['system', 'assistant', 'user']),
    content: z.union([z.string().min(0).max(1_200_000), MessageContentArraySchema]),
  }),
)

export const PromptUpdateableParamsSchema = z.object({
  name: z.string().min(1).max(255),
  studentInstructions: z.string().max(20_000),
  systemMessage: z.string().max(20_000),
  messages: PromptMessagesSchema.optional().default([]),
  hidden: z.boolean().default(false),
  ragIndexId: z.number().min(1).optional().nullable(),
  model: ValidModelNameSchema.or(z.literal('none'))
    .optional()
    .transform((val) => (val === 'none' ? null : val)),
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
