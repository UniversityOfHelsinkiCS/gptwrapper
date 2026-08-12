import z from 'zod/v4'
import { MessageContentArraySchema } from './chat'

export const PromptMessagesSchema = z.array(
  z.object({
    role: z.enum(['system', 'assistant', 'user']),
    content: z.union([z.string().min(0).max(1_200_000), MessageContentArraySchema]),
  }),
)

export const PromptUpdateableParamsSchema = z.object({
  name: z.string().min(1).max(255),
  userInstructions: z.string().max(20_000),
  systemMessage: z.string().max(20_000),
  messages: PromptMessagesSchema.optional().default([]),
  hidden: z.boolean().default(false),
  ragHidden: z.boolean().default(false),
  ragIndexId: z.number().min(1).optional().nullable(),
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

export const PromptCopyParamsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  target: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('PERSONAL'),
    }),
    z.object({
      type: z.literal('CHAT_INSTANCE'),
      chatInstanceId: z.string().min(1),
    }),
  ]),
})

/**
 * university prompts carry no source material and no userId/type,
 * the route sets those
 */
export const UniversityPromptCreationParamsSchema = z.object({
  name: z.string().min(1).max(255),
  userInstructions: z.string().max(20_000).optional().default(''),
  systemMessage: z.string().max(20_000),
  messages: PromptMessagesSchema.optional().default([]),
})

export const UniversityPromptTypeSchema = z.enum(['UNIVERSITY', 'TEMPLATE'])

export const UniversityPromptBodySchema = z
  .object({
    type: UniversityPromptTypeSchema,
    published: z.boolean().optional(),
    fi: UniversityPromptCreationParamsSchema.optional(),
    en: UniversityPromptCreationParamsSchema.optional(),
    sv: UniversityPromptCreationParamsSchema.optional(),
  })
  .refine((body) => Boolean(body.fi || body.en || body.sv), {
    message: 'At least one language (fi, en or sv) is required',
  })

export type PromptCreationParams = z.input<typeof PromptCreationParamsSchema>
export type PromptEditableParams = z.input<typeof PromptUpdateableParamsSchema>
export type PromptCopyParams = z.input<typeof PromptCopyParamsSchema>
export type UniversityPromptCreationParams = z.input<typeof UniversityPromptCreationParamsSchema>
export type UniversityPromptBody = z.input<typeof UniversityPromptBodySchema>
export type UniversityPromptType = z.infer<typeof UniversityPromptTypeSchema>
