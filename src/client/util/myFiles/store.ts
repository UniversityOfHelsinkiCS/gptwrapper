/**
 * The My files store: a per-browser file tree (OPFS in the app, memory in tests). Paths are relative to the My files
 * root and are normalised and checked by every method (see `paths.ts`). The store itself does not know about reserved
 * folders or who may write where: the picker import (`importFiles.ts`) and the agent tool executors apply those rules
 * on top of it.
 */

export type MyFilesErrorCode = 'invalid_path' | 'not_found' | 'not_a_file' | 'not_a_directory' | 'unsupported'

export class MyFilesError extends Error {
  readonly code: MyFilesErrorCode
  readonly path: string

  constructor(code: MyFilesErrorCode, path: string) {
    super(`${code}: ${path}`)
    this.name = 'MyFilesError'
    this.code = code
    this.path = path
  }
}

export const isMyFilesError = (error: unknown, code?: MyFilesErrorCode): error is MyFilesError =>
  error instanceof MyFilesError && (code === undefined || error.code === code)

export interface MyFilesEntry {
  /** Normalised path from the My files root, e.g. `Course/week1/notes.md`. */
  path: string
  name: string
  kind: 'file' | 'directory'
  /** Bytes; 0 for directories. */
  size: number
  /**
   * For files: the source file's `lastModified` when it was uploaded (or the time of the write when no source time was
   * given), in ms since the epoch. 0 for directories.
   */
  lastModified: number
}

export type MyFilesData = string | Blob | ArrayBuffer | Uint8Array

export interface WriteOptions {
  /** Recorded as the entry's `lastModified`; defaults to now. The picker passes the source file's time. */
  lastModified?: number
}

export interface MyFilesStore {
  /**
   * Entries directly in `dir` (default the root), or all descendants with `recursive`, sorted by path. Directories are
   * included. Throws `not_found` / `not_a_directory`.
   */
  list(dir?: string, options?: { recursive?: boolean }): Promise<MyFilesEntry[]>
  /** The entry at `path`, or null when nothing is there. `stat('')` is the root directory. */
  stat(path: string): Promise<MyFilesEntry | null>
  /** Throws `not_found` / `not_a_file`. */
  readText(path: string): Promise<string>
  readBytes(path: string): Promise<Uint8Array>
  /** Creates or replaces a file, creating parent directories. Throws `not_a_directory` if a parent is a file, `not_a_file` if `path` is a directory. */
  write(path: string, data: MyFilesData, options?: WriteOptions): Promise<MyFilesEntry>
  /** Creates a directory and its parents; no-op if it exists. */
  mkdir(path: string): Promise<void>
  /** Deletes a file, or a directory with everything in it. Throws `not_found`. Deleting the root is refused (`invalid_path`); use `clear`. */
  delete(path: string): Promise<void>
  /** Deletes everything. */
  clear(): Promise<void>
  /** Waits until metadata from earlier writes is persisted. Call after a batch of writes. */
  flush(): Promise<void>
}

export const toBytes = async (data: MyFilesData): Promise<Uint8Array> => {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(await data.arrayBuffer())
}
