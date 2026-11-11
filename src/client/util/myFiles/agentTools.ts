import type { ClientToolResult } from '../../../shared/chatSocket'
import {
  FILE_TOOL_LIMITS,
  FILE_TOOL_SUMMARY_LIMITS,
  FileToolInputSchemas,
  isFileToolName,
  LEARNING_GRAPH_PATH,
  MAX_ATTACHED_FOLDERS,
  PAGE_RANGE_PATTERN,
  type FileToolInput,
  type FileToolName,
  type FileToolSummary,
} from '../../../shared/fileTools'
import { AGENT_NOTES_FOLDER, isReservedPath, isWithin, OUTPUTS_FOLDER, RESERVED_FOLDERS, splitPath } from './paths'
import { defaultPdfPagesReader, PdfParseError, type PdfPagesReader } from './pdfText'
import { isMyFilesError, type MyFilesEntry, type MyFilesStore } from './store'

/**
 * The browser side of the agent's My files tools. The server relays the model's calls as they are, so every path is
 * resolved and checked here:
 * - the read tools (`ls`, `read_file`, `glob`, `grep`) see only the folders attached to the chat, `Outputs/` and
 *   `Agent notes/`;
 * - the write tools (`write_file`, `edit_file`) write only inside `Outputs/` and `Agent notes/`, and `delete_file`
 *   deletes only inside `Agent notes/`. The attached (student's) folders are never written. All of them refuse
 *   `Agent notes/learning-graph.json`, which is for the typed graph tools.
 * PDFs are read and searched as the text of their pages (`pdfText.ts`), with page numbers.
 * Folder names are compared case-sensitively. Anything else is refused with a `FileToolError`, whose message the
 * model reads.
 */

/** A refusal or failure the model is told about. */
export class FileToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileToolError'
  }
}

const quote = (text: string) => JSON.stringify(text)

/**
 * The top-level folders the agent can see: the attached ones that are valid single folder names (reserved names are
 * dropped case-insensitively, they are added as themselves), then `Outputs` and `Agent notes`.
 */
export const visibleFolders = (attachedFolders: readonly string[]): string[] => {
  const attached = attachedFolders.filter((folder) => {
    try {
      return typeof folder === 'string' && splitPath(folder).length === 1 && splitPath(folder)[0] === folder && !isReservedPath(folder)
    } catch {
      return false
    }
  })
  return [...new Set(attached)].slice(0, MAX_ATTACHED_FOLDERS).concat(RESERVED_FOLDERS)
}

/**
 * Resolves a path the model sent to a normalised My files path inside one of `folders`, or '' for the root (which
 * `ls` shows as the list of visible folders). Refuses absolute paths, '..', backslashes and control characters, and
 * any path whose first folder is not exactly (case-sensitively) one of `folders`.
 */
export const resolveAgentPath = (path: unknown, folders: readonly string[]): string => {
  if (typeof path !== 'string') throw new FileToolError('The path must be a string.')
  if (/^(?:[/\\~]|[a-zA-Z]:)/.test(path)) {
    throw new FileToolError(`${quote(path)} is an absolute path. Use a path relative to My files, for example ${quote(`${folders[0]}/notes.md`)}.`)
  }
  let segments: string[]
  try {
    segments = splitPath(path)
  } catch {
    throw new FileToolError(`${quote(path)} is not a valid path: ".." and backslashes are not allowed.`)
  }
  if (segments.length === 0) return ''
  if (!folders.includes(segments[0])) {
    throw new FileToolError(`${quote(path)} is outside the folders you can see: ${folders.map(quote).join(', ')}.`)
  }
  return segments.join('/')
}

/** A glob pattern as a regular expression over whole paths: `*` and `?` within a name, `**` across folders, `{a,b}`. */
export const globToRegExp = (pattern: string): RegExp => {
  let source = ''
  let braces = 0
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        source += '(?:.*/)?'
        i += 2
      } else {
        source += '.*'
        i += 1
      }
    } else if (char === '*') {
      source += '[^/]*'
    } else if (char === '?') {
      source += '[^/]'
    } else if (char === '{') {
      braces++
      source += '(?:'
    } else if (char === '}' && braces > 0) {
      braces--
      source += ')'
    } else if (char === ',' && braces > 0) {
      source += '|'
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    }
  }
  if (braces > 0) throw new FileToolError(`The glob pattern ${quote(pattern)} has an unclosed "{".`)
  return new RegExp(`^${source}$`)
}

const checkGlobPattern = (pattern: string, folders: readonly string[]) => {
  if (/^(?:[/\\~]|[a-zA-Z]:)/.test(pattern)) throw new FileToolError(`${quote(pattern)} is absolute. Patterns are relative to My files, for example "**/*.md".`)
  if (pattern.split('/').includes('..') || pattern.includes('\\'))
    throw new FileToolError(`${quote(pattern)} is not a valid pattern: ".." and backslashes are not allowed.`)
  if (pattern.length === 0) throw new FileToolError(`The pattern is empty. Try "**/*" or ${quote(`${folders[0]}/**/*.md`)}.`)
}

const BINARY_SNIFF_BYTES = 8000

const isPdf = (path: string) => path.toLowerCase().endsWith('.pdf')

const looksBinary = (bytes: Uint8Array) => bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0)

const cutLine = (line: string, max: number) => (line.length > max ? `${line.slice(0, max)}… [line cut]` : line)

const splitLines = (text: string) => {
  const lines = text.split(/\r\n|\n|\r/)
  if (lines.length > 1 && lines.at(-1) === '') lines.pop()
  return lines
}

const excerptOf = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

type Context = { store: MyFilesStore; folders: string[]; readPdf: PdfPagesReader }
type ToolOutput = { content: string; artifact: FileToolSummary }

const statOrThrow = async ({ store }: Context, path: string): Promise<MyFilesEntry> => {
  const entry = await store.stat(path)
  if (!entry) throw new FileToolError(`${quote(path)} was not found in My files.`)
  return entry
}

/** The existing visible folders, for the root listing and for searches over everything. */
const existingFolders = async ({ store, folders }: Context) => {
  const entries = await Promise.all(folders.map((folder) => store.stat(folder)))
  return folders.filter((_, index) => entries[index]?.kind === 'directory')
}

/** Every file under the visible folders (or under `path`), sorted by path. */
const filesUnder = async (ctx: Context, path: string): Promise<MyFilesEntry[]> => {
  if (path !== '') {
    const entry = await statOrThrow(ctx, path)
    if (entry.kind === 'file') return [entry]
    return (await ctx.store.list(path, { recursive: true })).filter((e) => e.kind === 'file')
  }
  const lists = await Promise.all((await existingFolders(ctx)).map((folder) => ctx.store.list(folder, { recursive: true })))
  return lists.flat().filter((e) => e.kind === 'file')
}

/** The text of a file for reading or searching, or the reason it cannot be read as text. */
const readTextFile = async ({ store }: Context, entry: MyFilesEntry): Promise<{ text: string } | { skipped: string }> => {
  if (isPdf(entry.path)) return { skipped: 'it is a PDF' }
  if (entry.size > FILE_TOOL_LIMITS.fileBytes) return { skipped: `the file is too large (${entry.size} bytes)` }
  const bytes = await store.readBytes(entry.path)
  if (looksBinary(bytes)) return { skipped: 'it is a binary file, not text' }
  return { text: new TextDecoder().decode(bytes) }
}

const NO_TEXT_LAYER = 'the PDF has no text layer (it is probably scanned, or its pages are images), and text in images cannot be read here'

/** The page texts of a PDF, or the reason it cannot be read. */
const readPdfPages = async (ctx: Context, entry: MyFilesEntry): Promise<{ pages: string[] } | { skipped: string }> => {
  if (entry.size > FILE_TOOL_LIMITS.pdfBytes) return { skipped: `the PDF is too large (${entry.size} bytes)` }
  let pages: string[]
  try {
    pages = await ctx.readPdf(ctx.store, entry)
  } catch (error) {
    if (error instanceof PdfParseError) return { skipped: error.message }
    throw error
  }
  if (pages.every((page) => page.trim() === '')) return { skipped: NO_TEXT_LAYER }
  return { pages }
}

const pageRange = (from: number, to: number) => (from === to ? `page ${from}` : `pages ${from}-${to}`)

const readPdfFile = async (ctx: Context, path: string, entry: MyFilesEntry, input: FileToolInput<'read_file'>): Promise<ToolOutput> => {
  const read = await readPdfPages(ctx, entry)
  if ('skipped' in read) throw new FileToolError(`${quote(path)} cannot be read: ${read.skipped}.`)
  const { pages } = read
  const total = pages.length

  let start = 1
  let end = total
  if (input.pages !== undefined) {
    const match = PAGE_RANGE_PATTERN.exec(input.pages)
    start = Number(match?.[1])
    end = match?.[2] === undefined ? start : Number(match[2])
    if (!match || start < 1 || end < start)
      throw new FileToolError(`${quote(input.pages)} is not a page range. Use a page number like "3" or a range like "3-5".`)
    if (start > total) throw new FileToolError(`${quote(path)} has only ${total} pages; page ${start} is past its end.`)
    end = Math.min(end, total)
  }

  const blocks: string[] = []
  let chars = 0
  let last = start - 1
  let pageCut = false
  for (let n = start; n <= end; n++) {
    const text = pages[n - 1].trim()
    const body =
      text === ''
        ? '[No text on this page]'
        : splitLines(text)
            .map((line) => cutLine(line, FILE_TOOL_LIMITS.lineChars))
            .join('\n')
    let block = `[Page ${n}]\n${body}`
    if (blocks.length > 0 && chars + block.length + 1 > FILE_TOOL_LIMITS.readChars) break
    // Always at least one page, cut if it alone is over the cap.
    if (block.length > FILE_TOOL_LIMITS.readChars) {
      block = `${block.slice(0, FILE_TOOL_LIMITS.readChars)}… [page cut]`
      pageCut = true
    }
    blocks.push(block)
    chars += block.length + 1
    last = n
    if (pageCut) break
  }

  const header = `${quote(path)} is a PDF with ${total} pages. ${pageRange(start, last).replace(/^p/, 'P')}:`
  const footer: string[] = []
  if (pageCut) footer.push(`[Page ${last} is longer than ${FILE_TOOL_LIMITS.readChars} characters and was cut. Use grep to find text in the rest of it.]`)
  if (last < total && (input.pages === undefined || last < end)) {
    const next = `${last + 1}-${Math.min(total, last + (last - start + 1))}`
    footer.push(`[Showing ${pageRange(start, last)} of ${total}. Use pages ${quote(next)} to read further.]`)
  }
  if (input.offset !== undefined || input.limit !== undefined) footer.push('[offset and limit do not apply to PDFs: use pages.]')

  return {
    content: [header, ...blocks, ...footer].join('\n'),
    artifact: {
      tool: 'read_file',
      path,
      startPage: start,
      endPage: last,
      totalPages: total,
      excerpt: excerptOf(pages.slice(start - 1, last).join('\n'), FILE_TOOL_SUMMARY_LIMITS.excerptChars),
    },
  }
}

const entryLine = (entry: MyFilesEntry) => (entry.kind === 'directory' ? `${entry.path}/` : `${entry.path} (${entry.size} bytes)`)

const ls = async (ctx: Context, input: FileToolInput<'ls'>): Promise<ToolOutput> => {
  const path = resolveAgentPath(input.path, ctx.folders)

  let entries: MyFilesEntry[]
  let header: string
  if (path === '') {
    const existing = await existingFolders(ctx)
    entries = existing.map((folder) => ({ path: folder, name: folder, kind: 'directory', size: 0, lastModified: 0 }))
    header = `The folders you can see in My files (${entries.length}):`
  } else {
    const entry = await statOrThrow(ctx, path)
    if (entry.kind === 'file') throw new FileToolError(`${quote(path)} is a file. Use read_file to read it.`)
    entries = await ctx.store.list(path)
    header = entries.length === 0 ? `${quote(path)} is empty.` : `${quote(path)} contains ${entries.length} entries:`
  }

  const shown = entries.slice(0, FILE_TOOL_LIMITS.lsEntries)
  const lines = [header, ...shown.map(entryLine)]
  if (entries.length > shown.length) lines.push(`[${entries.length - shown.length} more entries not shown. Use glob to find specific files.]`)

  return {
    content: lines.join('\n'),
    artifact: {
      tool: 'ls',
      path,
      entries: entries.slice(0, FILE_TOOL_SUMMARY_LIMITS.entries).map((e) => (e.kind === 'directory' ? `${e.name}/` : e.name)),
      total: entries.length,
    },
  }
}

const readFile = async (ctx: Context, input: FileToolInput<'read_file'>): Promise<ToolOutput> => {
  const path = resolveAgentPath(input.path, ctx.folders)
  if (path === '') throw new FileToolError('Give the path of a file to read, for example from ls.')
  const entry = await statOrThrow(ctx, path)
  if (entry.kind === 'directory') throw new FileToolError(`${quote(path)} is a folder. Use ls to list it.`)
  if (isPdf(path)) return readPdfFile(ctx, path, entry, input)
  if (input.pages !== undefined) throw new FileToolError(`pages is only for PDF files. Use offset and limit to read ${quote(path)}.`)

  const read = await readTextFile(ctx, entry)
  if ('skipped' in read) throw new FileToolError(`${quote(path)} cannot be read: ${read.skipped}.`)

  const lines = read.text.length === 0 ? [] : splitLines(read.text)
  const start = input.offset ?? 1
  if (lines.length === 0) {
    return { content: `${quote(path)} is empty.`, artifact: { tool: 'read_file', path, startLine: 0, endLine: 0, totalLines: 0, excerpt: '' } }
  }
  if (start > lines.length) throw new FileToolError(`${quote(path)} has only ${lines.length} lines; offset ${start} is past its end.`)

  const maxLines = input.limit ?? FILE_TOOL_LIMITS.readLines
  const out: string[] = []
  let chars = 0
  let end = start - 1
  for (let n = start; n <= lines.length && n < start + maxLines; n++) {
    const line = `${n}\t${cutLine(lines[n - 1], FILE_TOOL_LIMITS.lineChars)}`
    // Always at least one line, even a long one.
    if (out.length > 0 && chars + line.length + 1 > FILE_TOOL_LIMITS.readChars) break
    out.push(line)
    chars += line.length + 1
    end = n
  }

  const header = `${quote(path)}, lines ${start}-${end} of ${lines.length}:`
  const footer = end < lines.length ? [`[Showing lines ${start}-${end} of ${lines.length}. Use offset ${end + 1} to read further.]`] : []
  return {
    content: [header, ...out, ...footer].join('\n'),
    artifact: {
      tool: 'read_file',
      path,
      startLine: start,
      endLine: end,
      totalLines: lines.length,
      excerpt: excerptOf(lines.slice(start - 1, end).join('\n'), FILE_TOOL_SUMMARY_LIMITS.excerptChars),
    },
  }
}

const glob = async (ctx: Context, input: FileToolInput<'glob'>): Promise<ToolOutput> => {
  checkGlobPattern(input.pattern, ctx.folders)
  const regex = globToRegExp(input.pattern.replace(/^(?:\.\/)+/, ''))
  const matches = (await filesUnder(ctx, '')).filter((file) => regex.test(file.path)).map((file) => file.path)

  const shown = matches.slice(0, FILE_TOOL_LIMITS.globMatches)
  const lines =
    matches.length === 0
      ? [`No files match ${quote(input.pattern)}. Paths start with a folder name: ${ctx.folders.map(quote).join(', ')}; "**/" matches any folders.`]
      : [`${matches.length} files match ${quote(input.pattern)}:`, ...shown]
  if (matches.length > shown.length) lines.push(`[${matches.length - shown.length} more files not shown. Use a narrower pattern.]`)

  return {
    content: lines.join('\n'),
    artifact: { tool: 'glob', pattern: input.pattern, matches: matches.slice(0, FILE_TOOL_SUMMARY_LIMITS.matches), total: matches.length },
  }
}

const grep = async (ctx: Context, input: FileToolInput<'grep'>): Promise<ToolOutput> => {
  let regex: RegExp
  try {
    regex = new RegExp(input.pattern, input.ignore_case ? 'i' : '')
  } catch {
    throw new FileToolError(`${quote(input.pattern)} is not a valid JavaScript regular expression.`)
  }
  const path = input.path === undefined ? '' : resolveAgentPath(input.path, ctx.folders)
  const files = await filesUnder(ctx, path)

  const matches: { path: string; line: number; page?: number; text: string }[] = []
  const skipped: string[] = []
  let more = false
  search: for (const file of files) {
    // A text file is one page without a number.
    let pages: (string | undefined)[]
    if (isPdf(file.path)) {
      const read = await readPdfPages(ctx, file)
      if ('skipped' in read) {
        skipped.push(file.path)
        continue
      }
      pages = read.pages
    } else {
      const read = await readTextFile(ctx, file)
      if ('skipped' in read) {
        skipped.push(file.path)
        continue
      }
      pages = [read.text]
    }
    const pdf = isPdf(file.path)
    for (let p = 0; p < pages.length; p++) {
      const lines = splitLines(pages[p] ?? '')
      for (let i = 0; i < lines.length; i++) {
        const line = cutLine(lines[i], FILE_TOOL_LIMITS.lineChars)
        if (!regex.test(line)) continue
        if (matches.length === FILE_TOOL_LIMITS.grepMatches) {
          more = true
          break search
        }
        const text = cutLine(line.trim(), FILE_TOOL_LIMITS.grepLineChars)
        matches.push(pdf ? { path: file.path, page: p + 1, line: i + 1, text } : { path: file.path, line: i + 1, text })
      }
    }
  }

  const where = path === '' ? 'the folders you can see' : quote(path)
  const lines =
    matches.length === 0
      ? [`No lines match ${quote(input.pattern)} in ${where} (${files.length - skipped.length} files searched).`]
      : [
          `Lines matching ${quote(input.pattern)} in ${where}:`,
          ...matches.map((m) => (m.page === undefined ? `${m.path}:${m.line}: ${m.text}` : `${m.path} (page ${m.page}, line ${m.line}): ${m.text}`)),
        ]
  if (more) lines.push(`[Only the first ${matches.length} matches are shown. Use a narrower pattern or path.]`)
  if (skipped.length > 0) {
    lines.push(`[Not searched (binary, too large, or PDFs without a text layer): ${skipped.slice(0, 10).join(', ')}${skipped.length > 10 ? ', …' : ''}]`)
  }

  return {
    content: lines.join('\n'),
    artifact: {
      tool: 'grep',
      pattern: input.pattern,
      path,
      matches: matches.slice(0, FILE_TOOL_SUMMARY_LIMITS.matches).map((m) => ({ ...m, text: excerptOf(m.text, FILE_TOOL_SUMMARY_LIMITS.matchChars) })),
      total: matches.length,
    },
  }
}

/** Where `write_file` and `edit_file` may write, and where `delete_file` may delete. Exact folder names. */
const WRITABLE_FOLDERS: readonly string[] = [OUTPUTS_FOLDER, AGENT_NOTES_FOLDER]
const DELETABLE_FOLDERS: readonly string[] = [AGENT_NOTES_FOLDER]

/**
 * Resolves a path for a write tool: the same checks as reading (`resolveAgentPath`), then it must be inside (not be)
 * one of `allowed`, and must not be the learning graph (compared case-insensitively, so no variant of it can be made).
 */
export const resolveWritePath = (path: unknown, folders: readonly string[], allowed: readonly string[] = WRITABLE_FOLDERS): string => {
  const resolved = resolveAgentPath(path, folders)
  const segments = resolved === '' ? [] : resolved.split('/')
  const where = allowed.map((folder) => quote(`${folder}/`)).join(' or ')
  if (segments.length === 0 || !allowed.includes(segments[0])) {
    throw new FileToolError(
      `${quote(resolved || String(path))} cannot be changed: you can only change files in ${where}. The student's own folders are read-only.`,
    )
  }
  if (segments.length === 1)
    throw new FileToolError(`${quote(resolved)} is a folder. Give the path of a file in it, for example ${quote(`${resolved}/notes.md`)}.`)
  // Also refuses paths inside it, which would make it a folder.
  if (isWithin(resolved.toLowerCase(), LEARNING_GRAPH_PATH.toLowerCase())) {
    throw new FileToolError(
      `${quote(resolved)} is reserved for the learning graph and cannot be changed with ${quote('write_file')}, ${quote('edit_file')} or ${quote('delete_file')}.`,
    )
  }
  return resolved
}

const checkWriteSize = (path: string, text: string) => {
  if (text.length > FILE_TOOL_LIMITS.writeChars) {
    throw new FileToolError(`${quote(path)} would be ${text.length} characters; files you write can have at most ${FILE_TOOL_LIMITS.writeChars}.`)
  }
}

const writeFile = async (ctx: Context, input: FileToolInput<'write_file'>): Promise<ToolOutput> => {
  const path = resolveWritePath(input.path, ctx.folders)
  checkWriteSize(path, input.content)
  const existing = await ctx.store.stat(path)
  if (existing?.kind === 'directory') throw new FileToolError(`${quote(path)} is a folder. Give the path of a file.`)
  const entry = await ctx.store.write(path, input.content)
  await ctx.store.flush()
  return {
    content: `${existing ? 'Replaced' : 'Created'} ${quote(path)} (${entry.size} bytes).`,
    artifact: { tool: 'write_file', path, bytes: entry.size, created: !existing },
  }
}

const countOccurrences = (text: string, part: string) => {
  let count = 0
  for (let index = text.indexOf(part); index !== -1; index = text.indexOf(part, index + part.length)) count++
  return count
}

const editFile = async (ctx: Context, input: FileToolInput<'edit_file'>): Promise<ToolOutput> => {
  const path = resolveWritePath(input.path, ctx.folders)
  const entry = await statOrThrow(ctx, path)
  if (entry.kind === 'directory') throw new FileToolError(`${quote(path)} is a folder. Give the path of a file.`)
  const read = await readTextFile(ctx, entry)
  if ('skipped' in read) throw new FileToolError(`${quote(path)} cannot be edited: ${read.skipped}.`)

  const count = countOccurrences(read.text, input.old)
  if (count === 0) throw new FileToolError(`The text to replace was not found in ${quote(path)}. Read the file and copy the text exactly.`)
  if (count > 1) throw new FileToolError(`The text to replace occurs ${count} times in ${quote(path)}. Include more of the text around it so it occurs once.`)

  const index = read.text.indexOf(input.old)
  const text = read.text.slice(0, index) + input.new + read.text.slice(index + input.old.length)
  checkWriteSize(path, text)
  const written = await ctx.store.write(path, text)
  await ctx.store.flush()
  return { content: `Edited ${quote(path)} (${written.size} bytes).`, artifact: { tool: 'edit_file', path, bytes: written.size } }
}

const deleteFile = async (ctx: Context, input: FileToolInput<'delete_file'>): Promise<ToolOutput> => {
  const path = resolveWritePath(input.path, ctx.folders, DELETABLE_FOLDERS)
  await statOrThrow(ctx, path)
  await ctx.store.delete(path)
  await ctx.store.flush()
  return { content: `Deleted ${quote(path)}.`, artifact: { tool: 'delete_file', path } }
}

/** True for a successful `write_file` or `edit_file` summary of a file in `Outputs/`: what the chat lists under the answer. */
export const isOutputWrite = (summary: unknown): summary is Extract<FileToolSummary, { tool: 'write_file' | 'edit_file' }> => {
  const s = summary as Partial<FileToolSummary> | null | undefined
  if (!s || (s.tool !== 'write_file' && s.tool !== 'edit_file') || typeof s.path !== 'string') return false
  try {
    return isWithin(s.path, OUTPUTS_FOLDER) && s.path !== OUTPUTS_FOLDER
  } catch {
    return false
  }
}

const executors: { [Name in FileToolName]: (ctx: Context, input: FileToolInput<Name>) => Promise<ToolOutput> } = {
  ls,
  read_file: readFile,
  glob,
  grep,
  write_file: writeFile,
  edit_file: editFile,
  delete_file: deleteFile,
}

const storeErrorMessage = (error: unknown): string | null => {
  if (!isMyFilesError(error)) return null
  switch (error.code) {
    case 'not_found':
      return `${quote(error.path)} was not found in My files.`
    case 'not_a_file':
      return `${quote(error.path)} is a folder, not a file.`
    case 'not_a_directory':
      return `${quote(error.path)} is a file, not a folder.`
    case 'invalid_path':
      return `${quote(error.path)} is not a valid path.`
    case 'unsupported':
      return 'This browser cannot read My files.'
  }
}

/**
 * Runs one My files tool call from the agent against `store`, seeing only `attachedFolders`, `Outputs` and
 * `Agent notes`, and writing only in `Outputs` and `Agent notes`. Never throws: refusals and failures are error
 * results for the model. `readPdf` is the app's pdf.js reader with its OPFS cache unless given (tests).
 */
export const executeFileTool = async (
  store: MyFilesStore | null,
  attachedFolders: readonly string[],
  name: string,
  input: unknown,
  { readPdf = defaultPdfPagesReader }: { readPdf?: PdfPagesReader } = {},
): Promise<ClientToolResult> => {
  if (!isFileToolName(name)) return { status: 'error', error: `Unknown tool ${quote(name)}.` }
  if (!store) return { status: 'error', error: 'This browser cannot store My files.' }

  const parsed = FileToolInputSchemas[name].safeParse(input)
  if (!parsed.success) return { status: 'error', error: `Invalid input for ${name}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}` }

  try {
    const execute = executors[name] as (ctx: Context, input: unknown) => Promise<ToolOutput>
    const { content, artifact } = await execute({ store, folders: visibleFolders(attachedFolders), readPdf }, parsed.data)
    return { status: 'ok', content, artifact }
  } catch (error) {
    if (error instanceof FileToolError) return { status: 'error', error: error.message }
    const message = storeErrorMessage(error)
    if (message) return { status: 'error', error: message }
    console.error('My files tool failed:', error)
    return { status: 'error', error: 'The My files tool failed in the browser.' }
  }
}
