import z from 'zod/v4'

/**
 * The My files tools (issue 11): run in the browser against the My files store, called by the agent over the chat
 * socket (`tool.request` / `tool.result` in `chatSocket.ts`). The server only defines them for the model and relays
 * the calls; the browser executor (`client/util/myFiles/agentTools.ts`) checks every path itself.
 */
export const FILE_TOOL_NAMES = ['ls', 'read_file', 'glob', 'grep'] as const
export type FileToolName = (typeof FILE_TOOL_NAMES)[number]

export const isFileToolName = (name: string): name is FileToolName => (FILE_TOOL_NAMES as readonly string[]).includes(name)

/** At most this many folders can be attached to a chat. */
export const MAX_ATTACHED_FOLDERS = 20

/** Limits of the tool results, so one call cannot fill the model's context. */
export const FILE_TOOL_LIMITS = {
  /** Characters of a `read_file` result. */
  readChars: 40_000,
  /** Lines `read_file` returns when no `limit` is given. */
  readLines: 500,
  /** Longer lines are cut in `read_file` and `grep` results. */
  lineChars: 2000,
  /** Files larger than this are not read or searched. */
  fileBytes: 10 * 1024 * 1024,
  lsEntries: 500,
  globMatches: 200,
  grepMatches: 100,
  /** Characters of a `grep` match line. */
  grepLineChars: 300,
  /** Characters of a regular expression or glob pattern. */
  patternChars: 500,
} as const

const PathSchema = z.string().max(4096)

export const FileToolInputSchemas = {
  ls: z.object({
    path: PathSchema.describe('folder to list, relative to My files, e.g. "Course notes/week1"; "" lists the folders you can see'),
  }),
  read_file: z.object({
    path: PathSchema.describe('file to read, relative to My files, e.g. "Course notes/week1/lecture.md"'),
    offset: z.number().int().min(1).optional().describe('first line to read (1-based); default 1'),
    limit: z.number().int().min(1).optional().describe(`number of lines to read; default ${FILE_TOOL_LIMITS.readLines}`),
  }),
  glob: z.object({
    pattern: z
      .string()
      .max(FILE_TOOL_LIMITS.patternChars)
      .describe('glob pattern matched against file paths relative to My files: * and ? within a name, ** across folders, {a,b} alternatives; e.g. "**/*.md"'),
  }),
  grep: z.object({
    pattern: z.string().max(FILE_TOOL_LIMITS.patternChars).describe('JavaScript regular expression searched for in each line of the text files'),
    path: PathSchema.optional().describe('folder or file to search, relative to My files; default all the folders you can see'),
    ignore_case: z.boolean().optional().describe('match case-insensitively; default false'),
  }),
} satisfies Record<FileToolName, z.ZodType>

export type FileToolInput<Name extends FileToolName> = z.infer<(typeof FileToolInputSchemas)[Name]>

/**
 * What a file tool call shows in the chat and leaves in the history: the call's `ToolPart.result`. Short by design
 * (names, line numbers, excerpts), never the file contents, because it is stored with the chat and sent back to the
 * model as part of the history summary.
 */
export type FileToolSummary =
  | { tool: 'ls'; path: string; entries: string[]; total: number }
  | { tool: 'read_file'; path: string; startLine: number; endLine: number; totalLines: number; excerpt: string }
  | { tool: 'glob'; pattern: string; matches: string[]; total: number }
  | { tool: 'grep'; pattern: string; path: string; matches: { path: string; line: number; text: string }[]; total: number }

/** How many entries, matches and characters a summary keeps. */
export const FILE_TOOL_SUMMARY_LIMITS = { entries: 30, matches: 10, excerptChars: 200, matchChars: 120 } as const
