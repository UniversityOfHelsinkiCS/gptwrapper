import { RESERVED_FOLDERS, isReservedPath, normalizePath } from './paths'
import { isMyFilesError, type MyFilesStore } from './store'

/** A file picked or dropped by the student, with its path relative to what was picked (a folder's files start with the folder name). */
export interface ImportSource {
  path: string
  file: File
}

export type RefusalReason = 'reserved' | 'invalid_path' | 'conflict'

export interface ImportResult {
  added: string[]
  updated: string[]
  skipped: string[]
  refused: { path: string; reason: RefusalReason }[]
}

/** OS clutter that is never copied. */
const IGNORED_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

/** Creates the reserved top-level folders (`Outputs/`, `Agent notes/`) if they are missing. */
export const ensureReservedFolders = async (store: MyFilesStore) => {
  for (const folder of RESERVED_FOLDERS) await store.mkdir(folder)
}

/** Files from an `<input type="file">`; a `webkitdirectory` input gives each file a relative path starting with the folder name. */
export const sourcesFromFiles = (files: Iterable<File>): ImportSource[] => [...files].map((file) => ({ path: file.webkitRelativePath || file.name, file }))

/** For "Sync folder": puts the picked folder's contents into `folder`, whatever the picked folder is called. */
export const intoFolder = (sources: ImportSource[], folder: string): ImportSource[] =>
  sources.map((source) => {
    const segments = source.path.split('/').filter(Boolean)
    const rest = segments.length > 1 ? segments.slice(1) : segments
    return { ...source, path: [folder, ...rest].join('/') }
  })

/**
 * Copies picked files into the store. A file whose path already exists with the same size and `lastModified` is
 * skipped, a changed one is replaced ("updated"). Paths in reserved folders, invalid paths and paths that collide with
 * a folder (or have a file as a parent) are refused. One failure does not stop the rest.
 */
export const importFiles = async (
  store: MyFilesStore,
  sources: ImportSource[],
  { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
): Promise<ImportResult> => {
  const result: ImportResult = { added: [], updated: [], skipped: [], refused: [] }
  const wanted = sources.filter((source) => !IGNORED_NAMES.has(source.path.split('/').at(-1) ?? ''))

  try {
    for (const [index, { path: rawPath, file }] of wanted.entries()) {
      onProgress?.(index, wanted.length)
      let path: string
      try {
        path = normalizePath(rawPath)
      } catch {
        result.refused.push({ path: rawPath, reason: 'invalid_path' })
        continue
      }
      if (!path) {
        result.refused.push({ path: rawPath, reason: 'invalid_path' })
        continue
      }
      if (isReservedPath(path)) {
        result.refused.push({ path, reason: 'reserved' })
        continue
      }

      try {
        const existing = await store.stat(path)
        if (existing?.kind === 'directory') {
          result.refused.push({ path, reason: 'conflict' })
          continue
        }
        if (existing && existing.size === file.size && existing.lastModified === file.lastModified) {
          result.skipped.push(path)
          continue
        }
        await store.write(path, file, { lastModified: file.lastModified })
        ;(existing ? result.updated : result.added).push(path)
      } catch (error) {
        if (!isMyFilesError(error)) throw error
        result.refused.push({ path, reason: error.code === 'invalid_path' ? 'invalid_path' : 'conflict' })
      }
    }
    onProgress?.(wanted.length, wanted.length)
  } finally {
    await store.flush()
  }
  return result
}

const readEntries = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries(resolve, reject)
  })

const entryFile = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject)
  })

const collectEntry = async (entry: FileSystemEntry, out: ImportSource[]) => {
  if (entry.isFile) {
    // fullPath starts with '/'; importFiles normalises the rest and refuses invalid paths.
    out.push({ path: entry.fullPath.replace(/^\/+/, ''), file: await entryFile(entry as FileSystemFileEntry) })
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // readEntries returns the entries in batches (100 in Chromium) until it returns an empty batch.
  for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
    for (const child of batch) await collectEntry(child, out)
  }
}

/** Files and folders dropped on the dialog, with folders walked recursively. */
export const sourcesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<ImportSource[]> => {
  // The items are only readable synchronously in the drop handler, so the entries are taken before any await.
  const entries = [...dataTransfer.items]
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
  if (!entries.length || entries.some((entry) => !entry)) return sourcesFromFiles(dataTransfer.files)

  const out: ImportSource[] = []
  for (const entry of entries) await collectEntry(entry as FileSystemEntry, out)
  return out
}
