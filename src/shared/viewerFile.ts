import z from 'zod/v4'

/** A `ViewerFile` path longer than this is not sent. */
export const MAX_VIEWER_FILE_PATH_LENGTH = 1000

/** A `ViewerFile` heading is cut to this many characters. */
export const MAX_VIEWER_FILE_HEADING_LENGTH = 500

/**
 * The My files file the student had open in the file viewer (not minimized) when sending a message
 * (`UserMessage.viewerFile`). `page` is the PDF page in view, `heading` the Markdown heading of the section in view.
 */
export const ViewerFileSchema = z.object({
  path: z.string().min(1).max(MAX_VIEWER_FILE_PATH_LENGTH),
  page: z.number().int().positive().optional(),
  heading: z.string().min(1).max(MAX_VIEWER_FILE_HEADING_LENGTH).optional(),
})

export type ViewerFile = z.infer<typeof ViewerFileSchema>
