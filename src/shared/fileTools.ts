import z from 'zod/v4'

/**
 * The My files tools (issues 11 and 12): run in the browser against the My files store, called by the agent over the
 * chat socket (`tool.request` / `tool.result` in `chatSocket.ts`). The server only defines them for the model and
 * relays the calls; the browser executor (`client/util/myFiles/agentTools.ts`) checks every path itself. The read
 * tools see the attached folders, `Outputs/` and `Agent notes/`; the write tools write only in `Outputs/` and
 * `Agent notes/`, and `delete_file` deletes only in `Agent notes/`.
 */
export const FILE_READ_TOOL_NAMES = ['ls', 'read_file', 'glob', 'grep'] as const
export const FILE_WRITE_TOOL_NAMES = ['write_file', 'edit_file', 'delete_file'] as const
export const FILE_TOOL_NAMES = [...FILE_READ_TOOL_NAMES, ...FILE_WRITE_TOOL_NAMES] as const
export type FileToolName = (typeof FILE_TOOL_NAMES)[number]
export type FileWriteToolName = (typeof FILE_WRITE_TOOL_NAMES)[number]

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
  /** Text files larger than this are not read or searched. */
  fileBytes: 10 * 1024 * 1024,
  /** PDFs larger than this are not parsed. */
  pdfBytes: 50 * 1024 * 1024,
  lsEntries: 500,
  globMatches: 200,
  grepMatches: 100,
  /** Characters of a `grep` match line. */
  grepLineChars: 300,
  /** Characters of a regular expression or glob pattern. */
  patternChars: 500,
  /** Characters of a file the agent writes (`write_file` content, or a file after `edit_file`). */
  writeChars: 100_000,
} as const

/**
 * Reserved for the typed learning graph tools (Phase 4): the generic write tools refuse it, in any case. Restoring it
 * from a zip of `Agent notes/` is allowed.
 */
export const LEARNING_GRAPH_PATH = 'Agent notes/learning-graph.json'

const PathSchema = z.string().max(4096)

/** A page range of `read_file` on a PDF: one page (`'3'`) or a range (`'3-5'`), 1-based. */
export const PAGE_RANGE_PATTERN = /^\s*(\d{1,6})\s*(?:[-–]\s*(\d{1,6})\s*)?$/

export const FileToolInputSchemas = {
  ls: z.object({
    path: PathSchema.describe('folder to list, relative to My files, e.g. "Course notes/week1"; "" lists the folders you can see'),
  }),
  read_file: z.object({
    path: PathSchema.describe('file to read, relative to My files, e.g. "Course notes/week1/lecture.md"'),
    offset: z.number().int().min(1).optional().describe('first line to read (1-based); default 1. Not for PDFs'),
    limit: z.number().int().min(1).optional().describe(`number of lines to read; default ${FILE_TOOL_LIMITS.readLines}. Not for PDFs`),
    pages: z
      .string()
      .max(20)
      .regex(PAGE_RANGE_PATTERN, 'pages must be a page number or a range like "3-5"')
      .optional()
      .describe('PDFs only: the page or pages to read, e.g. "3" or "3-5" (1-based); default from page 1 as far as fits'),
  }),
  glob: z.object({
    pattern: z
      .string()
      .max(FILE_TOOL_LIMITS.patternChars)
      .describe('glob pattern matched against file paths relative to My files: * and ? within a name, ** across folders, {a,b} alternatives; e.g. "**/*.md"'),
  }),
  grep: z.object({
    pattern: z.string().max(FILE_TOOL_LIMITS.patternChars).describe('JavaScript regular expression searched for in each line of the text files and PDFs'),
    path: PathSchema.optional().describe('folder or file to search, relative to My files; default all the folders you can see'),
    ignore_case: z.boolean().optional().describe('match case-insensitively; default false'),
  }),
  write_file: z.object({
    path: PathSchema.describe('file to create or replace, in "Outputs/" or "Agent notes/", e.g. "Outputs/study-plan.md"'),
    content: z.string().max(FILE_TOOL_LIMITS.writeChars).describe('the whole text of the file'),
  }),
  edit_file: z.object({
    path: PathSchema.describe('file to change, in "Outputs/" or "Agent notes/", e.g. "Agent notes/learner-profile.md"'),
    old: z.string().min(1).max(FILE_TOOL_LIMITS.writeChars).describe('the exact text to replace; it must occur exactly once in the file'),
    new: z.string().max(FILE_TOOL_LIMITS.writeChars).describe('the text that replaces it'),
  }),
  delete_file: z.object({
    path: PathSchema.describe('file or folder to delete, in "Agent notes/" only, e.g. "Agent notes/old-plan.md"'),
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
  /** `read_file` on a PDF. */
  | { tool: 'read_file'; path: string; startPage: number; endPage: number; totalPages: number; excerpt: string }
  | { tool: 'glob'; pattern: string; matches: string[]; total: number }
  /** `page` is set for matches in a PDF; their `line` is the line within that page. */
  | { tool: 'grep'; pattern: string; path: string; matches: { path: string; line: number; page?: number; text: string }[]; total: number }
  | { tool: 'write_file'; path: string; bytes: number; created: boolean }
  | { tool: 'edit_file'; path: string; bytes: number }
  | { tool: 'delete_file'; path: string }

/** How many entries, matches and characters a summary keeps. */
export const FILE_TOOL_SUMMARY_LIMITS = { entries: 30, matches: 10, excerptChars: 200, matchChars: 120 } as const
