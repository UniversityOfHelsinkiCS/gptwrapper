import { AGENT_NOTES_FOLDER, splitPath } from './paths'
import type { MyFilesStore } from './store'

/**
 * Export and import of `Agent notes/` as a zip, so the student can move or restore the agent's notes (and later the
 * learning graph). The zip's entries are `Agent notes/<path>`, as the folder is in My files. Importing replaces the
 * whole folder, and only after every entry has been checked: an entry outside `Agent notes/` (`..`, an absolute path,
 * a backslash or another folder: "zip slip"), too many files or too many bytes refuse the whole zip.
 *
 * The zip library (fflate) is loaded only when a zip is made or read.
 */

export const NOTES_ZIP_LIMITS = {
  /** Size of the zip file itself. */
  zipBytes: 20 * 1024 * 1024,
  files: 500,
  /** Uncompressed size of all files together. */
  totalBytes: 20 * 1024 * 1024,
}

export type NotesZipLimits = typeof NOTES_ZIP_LIMITS

export type NotesZipErrorCode = 'invalid_zip' | 'invalid_path' | 'too_many_files' | 'too_large' | 'empty'

export class NotesZipError extends Error {
  readonly code: NotesZipErrorCode
  readonly path?: string

  constructor(code: NotesZipErrorCode, path?: string) {
    super(path ? `${code}: ${path}` : code)
    this.name = 'NotesZipError'
    this.code = code
    this.path = path
  }
}

export const NOTES_ZIP_FILE_NAME = 'agent-notes.zip'

/** Clutter that zip tools on macOS and Windows add; skipped, not refused. */
const isClutter = (name: string) => name.startsWith('__MACOSX/') || /(?:^|\/)(?:\.DS_Store|Thumbs\.db|desktop\.ini)$/.test(name)

/**
 * The path in My files of a zip entry, or null for the `Agent notes/` folder entry itself. Throws `invalid_path` for
 * anything that is not inside `Agent notes/` (compared case-sensitively).
 */
export const notesEntryPath = (name: string): string | null => {
  if (/^(?:[/\\~]|[a-zA-Z]:)/.test(name) || name.includes('\\')) throw new NotesZipError('invalid_path', name)
  let segments: string[]
  try {
    segments = splitPath(name)
  } catch {
    throw new NotesZipError('invalid_path', name)
  }
  if (segments[0] !== AGENT_NOTES_FOLDER) throw new NotesZipError('invalid_path', name)
  return segments.length === 1 ? null : segments.join('/')
}

/** Zips every file in `Agent notes/`. */
export const exportAgentNotes = async (store: MyFilesStore): Promise<Blob> => {
  const { zipSync } = await import('fflate')
  const entries = (await store.stat(AGENT_NOTES_FOLDER)) ? await store.list(AGENT_NOTES_FOLDER, { recursive: true }) : []
  const files: Record<string, Uint8Array> = {}
  for (const entry of entries) {
    if (entry.kind === 'file') files[entry.path] = await store.readBytes(entry.path)
  }
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' })
}

export type NotesZipFile = { path: string; bytes: Uint8Array }

const toUint8Array = async (data: Blob | ArrayBuffer | Uint8Array) =>
  data instanceof Uint8Array ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(await data.arrayBuffer())

/**
 * Reads and checks a zip of `Agent notes/` without writing anything. Every entry, folders too, must be inside
 * `Agent notes/`; the declared and the inflated sizes are both checked against `limits`.
 */
export const readAgentNotesZip = async (data: Blob | ArrayBuffer | Uint8Array, limits: NotesZipLimits = NOTES_ZIP_LIMITS): Promise<NotesZipFile[]> => {
  const size = data instanceof Blob ? data.size : data.byteLength
  if (size > limits.zipBytes) throw new NotesZipError('too_large')
  const bytes = await toUint8Array(data)
  const { unzipSync } = await import('fflate')

  let problem: NotesZipError | null = null
  let count = 0
  let declared = 0
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(bytes, {
      // Runs for every entry before it is inflated, so nothing is unpacked from a zip that is refused.
      filter: (file) => {
        if (problem || isClutter(file.name)) return false
        try {
          const path = notesEntryPath(file.name)
          if (path === null || file.name.endsWith('/')) return false
        } catch (error) {
          problem = error as NotesZipError
          return false
        }
        count++
        declared += file.originalSize
        if (count > limits.files) problem = new NotesZipError('too_many_files')
        else if (declared > limits.totalBytes) problem = new NotesZipError('too_large')
        return !problem
      },
    })
  } catch {
    throw new NotesZipError('invalid_zip')
  }
  if (problem) throw problem

  const files: NotesZipFile[] = []
  let total = 0
  for (const [name, content] of Object.entries(unzipped)) {
    const path = notesEntryPath(name)
    if (!path) continue
    // The declared size can lie; the inflated size is what counts.
    total += content.byteLength
    if (total > limits.totalBytes) throw new NotesZipError('too_large')
    files.push({ path, bytes: content })
  }

  // A path that is both a file and the folder of another file cannot be written.
  const paths = new Set(files.map((file) => file.path))
  for (const { path } of files) {
    const segments = path.split('/')
    for (let i = 2; i < segments.length; i++) {
      const parent = segments.slice(0, i).join('/')
      if (paths.has(parent)) throw new NotesZipError('invalid_path', parent)
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

/** Replaces everything in `Agent notes/` with `files`, which `readAgentNotesZip` has checked. */
export const replaceAgentNotes = async (store: MyFilesStore, files: NotesZipFile[]) => {
  if (await store.stat(AGENT_NOTES_FOLDER)) await store.delete(AGENT_NOTES_FOLDER)
  await store.mkdir(AGENT_NOTES_FOLDER)
  for (const file of files) await store.write(file.path, file.bytes)
  await store.flush()
}

/** Replaces everything in `Agent notes/` with the files of the zip, once the whole zip has been checked. */
export const importAgentNotes = async (
  store: MyFilesStore,
  data: Blob | ArrayBuffer | Uint8Array,
  limits: NotesZipLimits = NOTES_ZIP_LIMITS,
): Promise<{ files: number }> => {
  const files = await readAgentNotesZip(data, limits)
  if (files.length === 0) throw new NotesZipError('empty')
  await replaceAgentNotes(store, files)
  return { files: files.length }
}
