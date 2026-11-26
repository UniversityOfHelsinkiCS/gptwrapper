import z from 'zod/v4'

const ChatEventSchema = z
  .object({
    feature: z.literal('chat'),
    action: z.literal('send'),
  })
  .strict()

const QuoteEventSchema = z
  .object({
    feature: z.literal('quote'),
    action: z.enum(['explain', 'summarize', 'translate', 'ask_sent']),
  })
  .strict()

const ViewerEventSchema = z
  .object({
    feature: z.literal('viewer'),
    action: z.literal('open'),
    fileType: z.enum(['pdf', 'md', 'txt']),
    source: z.enum(['my_files', 'quote', 'chat_files', 'agent_link']),
  })
  .strict()

const MyFilesUploadEventSchema = z
  .object({
    feature: z.literal('my_files'),
    action: z.literal('upload'),
    fileCount: z.number().int().positive(),
    /** A bare lowercase extension (`pdf`, `zip`, ...) or `mixed`; never a file name or path. */
    fileType: z.string().regex(/^[a-z0-9]{1,16}$/),
  })
  .strict()

const MyFilesAttachFolderEventSchema = z
  .object({
    feature: z.literal('my_files'),
    action: z.literal('attach_folder'),
  })
  .strict()

/**
 * A feature usage ping. Each event becomes exactly one log line `logger.info('FeatureEvent', event)` (Loki in
 * production), which the Grafana feature usage heatmap counts by `feature` and `action`. This JSDoc is the only
 * documentation of the events and the contract with that panel. Events never carry a user, a course or file paths/names.
 *
 * - `chat` / `send`: every sent chat message (the baseline). Recorded on the server in `runAgent`, after request
 *   validation, from the last user message; resumed runs are not recorded.
 * - `quote` / `explain` | `summarize` | `translate` | `ask_sent`: a sent message with quotes, recorded in `runAgent`
 *   alongside its `chat` / `send`. The first three come from the message's `quickAction`; `ask_sent` is a message with
 *   quotes and no `quickAction`.
 * - `viewer` / `open`: every user-initiated open of the file viewer, from any entry point (including switching files in
 *   the per-chat file list), recorded on the client in `FileViewerContext.open`. `fileType` is the opened file's type,
 *   `source` the entry point. Restoring the viewer from storage or expanding it from the minimized rail is not an open.
 * - `my_files` / `upload`: one event per My files upload action (file picker or drop), not per file, recorded on the
 *   client around the `importFiles` call in `MyFilesDialog`. `fileCount` is the number of files, `fileType` their
 *   extension or `mixed`.
 * - `my_files` / `attach_folder`: the user attaching a folder in `AttachFolders`, recorded on the client. The automatic
 *   attach when a file is opened and detaching are not counted.
 *
 * Sent by the client to `POST /api/analytics/events` (one event per request).
 */
export const FeatureEventSchema = z.discriminatedUnion('feature', [
  ChatEventSchema,
  QuoteEventSchema,
  ViewerEventSchema,
  z.discriminatedUnion('action', [MyFilesUploadEventSchema, MyFilesAttachFolderEventSchema]),
])

export type FeatureEvent = z.infer<typeof FeatureEventSchema>
