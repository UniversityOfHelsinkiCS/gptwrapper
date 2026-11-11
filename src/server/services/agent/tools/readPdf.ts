import { tool, type ToolRunnableConfig } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import { z } from 'zod/v4'
import { getModelConfig, isMockModel, PDF_READER_MODEL, type ValidModelName } from '@config'
import type { SubagentPart } from '@shared/agentChat'
import { FILE_TOOL_SUMMARY_LIMITS, PAGE_RANGE_PATTERN, type FileToolSummary } from '@shared/fileTools'
import { READ_PDF, type ReadPdfProgress } from '@shared/readPdf'
import { getAgentModel } from '../agentModel'
import { toolErrorMiddleware } from '../toolMiddleware'
import { createFileTool, type FileToolHooks } from './fileTools'
import { pdfReaderSystemPrompt, pdfReaderTask } from './readPdfPrompt'
import { runSubagent, summarizeSubagentPart } from './subagent'
import { DEFAULT_SUBAGENT_CALLS_PER_RUN, ToolError, writeToolProgress, type EnabledTool, type SubagentToolModule, type ToolContext } from './types'

/** The subagent's model: `PDF_READER_MODEL` (the local Toska model by default), the mock model in chats with the mock model. */
export const pdfReaderModel = (chatModel: ValidModelName): ValidModelName => (isMockModel(chatModel) ? 'mock' : PDF_READER_MODEL)

const InputSchema = z.object({
  path: z.string().max(4096).describe('the PDF in My files, relative to My files, e.g. "Course notes/textbook.pdf"'),
  task: z
    .string()
    .min(1)
    .max(2000)
    .describe('what to find out from the PDF, as a precise and self-contained request, e.g. "Summarise chapter 2" or "Find the definition of entropy"'),
})

const instructions = `read_pdf hands a PDF in My files and a task to a PDF reader, which reads the PDF and answers briefly with page numbers. Use it instead of read_file for long PDFs or when you would need many pages; use read_file for a page or two. Give it a precise, self-contained task. At most ${DEFAULT_SUBAGENT_CALLS_PER_RUN} calls per answer.`

/** The first and last page of a `pages` input ("3" or "3-5"), or null. */
const pageRange = (pages: unknown): { startPage: number; endPage: number } | null => {
  const match = typeof pages === 'string' ? PAGE_RANGE_PATTERN.exec(pages) : null
  if (!match) return null
  const startPage = Number(match[1])
  return { startPage, endPage: match[2] === undefined ? startPage : Number(match[2]) }
}

const stringField = (input: unknown, field: string): string | undefined => {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>)[field] : undefined
  return typeof value === 'string' ? value : undefined
}

const isPdfReadSummary = (artifact: unknown): artifact is Extract<FileToolSummary, { totalPages: number }> =>
  typeof artifact === 'object' && artifact !== null && (artifact as { tool?: unknown }).tool === 'read_file' && 'totalPages' in artifact

/**
 * The subagent's tools: the browser's read tools only, through the same bridge as the main agent's (same path
 * limits, checked by the browser). `read_file` and `grep` report what they read as progress of the `read_pdf` call.
 */
const readerTools = (ctx: ToolContext, report: (progress: ReadPdfProgress) => void) => {
  const totalPages = new Map<string, number>()
  const readHooks: FileToolHooks = {
    onCall: (input) => {
      const path = stringField(input, 'path') ?? ''
      const total = totalPages.get(path)
      const range = pageRange(stringField(input, 'pages'))
      report({
        action: 'read',
        path,
        ...(range ? { startPage: range.startPage, endPage: total === undefined ? range.endPage : Math.min(range.endPage, total) } : {}),
        ...(total !== undefined ? { totalPages: total } : {}),
      })
    },
    onResult: (_input, result) => {
      if (!isPdfReadSummary(result.artifact)) return
      const { path, startPage, endPage, totalPages: total } = result.artifact
      totalPages.set(path, total)
      report({ action: 'read', path, startPage, endPage, totalPages: total })
    },
  }
  const grepHooks: FileToolHooks = {
    onCall: (input) => report({ action: 'search', path: stringField(input, 'path') ?? '', pattern: stringField(input, 'pattern') ?? '' }),
  }
  return [createFileTool('read_file', readHooks)(ctx), createFileTool('grep', grepHooks)(ctx), createFileTool('ls')(ctx)]
}

const pathOfPart = (part: SubagentPart): string | undefined =>
  part.parts.flatMap((nested) => (nested.type === 'tool' ? [stringField(nested.input, 'path')] : [])).find((path) => path?.toLowerCase().endsWith('.pdf'))

/** The task and an excerpt of the answer (`summarizeSubagentPart`), with the PDF it read when known. */
const summarizeReadPdf = (part: SubagentPart): string => {
  const summary = summarizeSubagentPart(part)
  const path = pathOfPart(part)
  return path
    ? summary.replace(
        `[Asked the subagent ${part.name}:`,
        `[Asked the subagent ${part.name} about ${JSON.stringify(path.slice(0, FILE_TOOL_SUMMARY_LIMITS.excerptChars))}:`,
      )
    : summary
}

/**
 * The PDF reader subagent (issue 14). Not enabled per prompt (no `promptOption`): like the file tools, it is on for
 * admins' socket runs, when folders are attached (`readPdfFor`).
 */
export const readPdf: SubagentToolModule = {
  name: READ_PDF,
  kind: 'subagent',
  executor: 'server',
  stage: 'experimental',
  instructions,

  create: (ctx) =>
    tool(
      async ({ path, task }: z.infer<typeof InputSchema>, runtime: ToolRunnableConfig) => {
        if (!ctx.callClientTool) throw new ToolError('My files is not available in this chat.')
        if (!path.toLowerCase().endsWith('.pdf')) throw new ToolError(`read_pdf reads PDFs only; use read_file for ${JSON.stringify(path)}.`)
        const modelConfig = getModelConfig(pdfReaderModel(ctx.model))
        if (!modelConfig) throw new Error(`Unknown PDF reader model: ${pdfReaderModel(ctx.model)}`)

        const agent = createAgent({
          model: getAgentModel(modelConfig),
          tools: readerTools(ctx, (progress) => writeToolProgress(runtime, progress)),
          systemPrompt: pdfReaderSystemPrompt,
          middleware: [toolErrorMiddleware(ctx.signal)],
        })
        const answer = await runSubagent({ agent, task: pdfReaderTask(path, task), runtime })
        return answer.trim().length > 0 ? answer : 'The PDF reader gave no answer.'
      },
      {
        name: READ_PDF,
        description: 'Delegates reading a PDF in My files to a PDF reader, which answers a task about it briefly, with page numbers.',
        schema: InputSchema,
      },
    ),

  summarizeForHistory: summarizeReadPdf,
}

/** `read_pdf` for a socket run with these attached folders: only when there are some, since PDFs are in the student's own folders. */
export const readPdfFor = (attachedFolders: string[]): EnabledTool[] => (attachedFolders.length > 0 ? [{ name: READ_PDF }] : [])
