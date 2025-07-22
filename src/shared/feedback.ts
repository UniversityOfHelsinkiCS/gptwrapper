import z from 'zod/v4'

export const FeedbackMetadataSchema = z
  .object({
    url: z.string(),
    courseId: z.string(),
    model: z.string(),
    promptId: z.string(),
    ragIndexId: z.number(),
    nMessages: z.number(),
    fileSearchesMade: z.number(),
    filesUploaded: z.number(),
    language: z.string(),
    browser: z.string(),
    os: z.string(),
    mobile: z.boolean(),
    screenResolution: z.string(),
  })
  .partial()
  .default({})

export type FeedbackMetadata = z.infer<typeof FeedbackMetadataSchema>

export const FeedbackPostSchema = z.object({
  feedback: z.string().min(1).max(40_000),
  responseWanted: z.boolean().default(false),
  metadata: FeedbackMetadataSchema,
})

export type FeedbackPost = z.infer<typeof FeedbackPostSchema>
