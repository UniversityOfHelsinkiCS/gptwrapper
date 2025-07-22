import z from 'zod/v4'

const shortString = z.string().max(200)

export const FeedbackMetadataSchema = z
  .object({
    url: z.url(),
    courseId: shortString,
    model: shortString,
    promptId: shortString,
    promptName: shortString,
    ragIndexId: z.number(),
    ragIndexName: shortString,
    nMessages: z.number(),
    fileSearchesMade: z.number(),
    filesUploaded: z.number(),
    language: shortString,
    browser: shortString,
    os: shortString,
    mobile: z.boolean(),
    screenResolution: shortString,
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
