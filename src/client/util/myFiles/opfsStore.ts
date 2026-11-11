import { baseName, isWithin, splitPath } from './paths'
import { MyFilesError, type MyFilesData, type MyFilesEntry, type MyFilesStore, type WriteOptions } from './store'

/**
 * `MyFilesStore` on the Origin Private File System. The tree lives in the OPFS directory `my-files/`. OPFS sets a
 * file's `lastModified` to the time it was written, so the source file's time (what the picker compares) is kept in
 * `my-files.meta.json` next to it, outside the tree. That metadata is written in the background after writes and on
 * `flush()`, under a Web Lock so tabs do not overwrite each other's changes. If it is lost, an entry falls back to the
 * copy's own time, which at worst makes the next sync copy that file again.
 */

const ROOT_DIR = 'my-files'
const META_FILE = 'my-files.meta.json'
const META_LOCK = 'currechat-my-files-meta'
const FLUSH_DELAY_MS = 300

type MetaFiles = Record<string, number>
type MetaOp = { type: 'set'; path: string; lastModified: number } | { type: 'delete'; path: string } | { type: 'clear' }

// TypeScript's DOM lib only types the async iterators with DOM.AsyncIterable, which this project does not enable.
type IterableDirectory = FileSystemDirectoryHandle & { entries(): AsyncIterable<[string, FileSystemHandle]> }

export const isOpfsSupported = (): boolean => typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function'

const mapError = (error: unknown, path: string, expected: 'file' | 'directory'): unknown => {
  if (error instanceof MyFilesError) return error
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotFoundError') return new MyFilesError('not_found', path)
  if (name === 'TypeMismatchError') return new MyFilesError(expected === 'file' ? 'not_a_file' : 'not_a_directory', path)
  return error
}

const applyOps = (files: MetaFiles, ops: MetaOp[]): MetaFiles => {
  let result = files
  for (const op of ops) {
    if (op.type === 'clear') result = {}
    else if (op.type === 'set') result = { ...result, [op.path]: op.lastModified }
    else result = Object.fromEntries(Object.entries(result).filter(([path]) => !isWithin(path, op.path)))
  }
  return result
}

const writeFile = async (handle: FileSystemFileHandle, data: MyFilesData, path: string) => {
  if (typeof handle.createWritable !== 'function') throw new MyFilesError('unsupported', path)
  const writable = await handle.createWritable()
  try {
    await writable.write(data as FileSystemWriteChunkType)
  } finally {
    await writable.close()
  }
}

export const createOpfsStore = (getRoot: () => Promise<FileSystemDirectoryHandle> = () => navigator.storage.getDirectory()): MyFilesStore => {
  let rootPromise: Promise<FileSystemDirectoryHandle> | null = null
  let basePromise: Promise<FileSystemDirectoryHandle> | null = null
  const root = () => (rootPromise ??= getRoot())
  const base = () => (basePromise ??= root().then((dir) => dir.getDirectoryHandle(ROOT_DIR, { create: true })))

  let pending: MetaOp[] = []
  let inFlight: MetaOp[] = []
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  let flushChain: Promise<void> = Promise.resolve()

  const withLock = <T>(fn: () => Promise<T>): Promise<T> =>
    typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(META_LOCK, fn) : fn()

  const readMetaFile = async (): Promise<MetaFiles> => {
    try {
      const file = await (await (await root()).getFileHandle(META_FILE)).getFile()
      const parsed = JSON.parse(await file.text()) as { files?: MetaFiles }
      return parsed.files && typeof parsed.files === 'object' ? parsed.files : {}
    } catch {
      return {}
    }
  }

  const readMeta = async () => applyOps(await readMetaFile(), [...inFlight, ...pending])

  const doFlush = async () => {
    if (!pending.length) return
    inFlight = pending
    pending = []
    try {
      await withLock(async () => {
        const files = applyOps(await readMetaFile(), inFlight)
        const handle = await (await root()).getFileHandle(META_FILE, { create: true })
        await writeFile(handle, JSON.stringify({ version: 1, files }), META_FILE)
      })
    } finally {
      inFlight = []
    }
  }

  const flush = () => {
    clearTimeout(flushTimer)
    flushTimer = undefined
    flushChain = flushChain.then(doFlush).catch(() => {})
    return flushChain
  }

  const record = (op: MetaOp) => {
    pending.push(op)
    if (flushTimer === undefined) flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS)
  }

  const getDir = async (segments: string[], create: boolean) => {
    let dir = await base()
    for (let i = 0; i < segments.length; i++) {
      try {
        dir = await dir.getDirectoryHandle(segments[i], { create })
      } catch (error) {
        throw mapError(error, segments.slice(0, i + 1).join('/'), 'directory')
      }
    }
    return dir
  }

  const getFileHandle = async (path: string) => {
    const segments = splitPath(path)
    const normalized = segments.join('/')
    if (!segments.length) throw new MyFilesError('not_a_file', normalized)
    const dir = await getDir(segments.slice(0, -1), false)
    try {
      return await dir.getFileHandle(segments[segments.length - 1])
    } catch (error) {
      throw mapError(error, normalized, 'file')
    }
  }

  const fileEntry = (path: string, file: File, meta: MetaFiles): MyFilesEntry => ({
    path,
    name: baseName(path),
    kind: 'file',
    size: file.size,
    lastModified: meta[path] ?? file.lastModified,
  })

  const dirEntry = (path: string): MyFilesEntry => ({ path, name: baseName(path), kind: 'directory', size: 0, lastModified: 0 })

  const walk = async (dir: FileSystemDirectoryHandle, dirPath: string, recursive: boolean, meta: MetaFiles, out: MyFilesEntry[]) => {
    for await (const [name, handle] of (dir as IterableDirectory).entries()) {
      const path = dirPath ? `${dirPath}/${name}` : name
      if (handle.kind === 'file') {
        out.push(fileEntry(path, await (handle as FileSystemFileHandle).getFile(), meta))
      } else {
        out.push(dirEntry(path))
        if (recursive) await walk(handle as FileSystemDirectoryHandle, path, recursive, meta, out)
      }
    }
  }

  return {
    async list(dir = '', { recursive = false } = {}) {
      const segments = splitPath(dir)
      const handle = await getDir(segments, false)
      const out: MyFilesEntry[] = []
      await walk(handle, segments.join('/'), recursive, await readMeta(), out)
      return out.sort((a, b) => a.path.localeCompare(b.path))
    },

    async stat(path) {
      const segments = splitPath(path)
      const normalized = segments.join('/')
      if (!segments.length) return dirEntry('')
      let parent: FileSystemDirectoryHandle
      try {
        parent = await getDir(segments.slice(0, -1), false)
      } catch (error) {
        if (error instanceof MyFilesError && (error.code === 'not_found' || error.code === 'not_a_directory')) return null
        throw error
      }
      const name = segments[segments.length - 1]
      try {
        const file = await (await parent.getFileHandle(name)).getFile()
        return fileEntry(normalized, file, await readMeta())
      } catch (error) {
        const mapped = mapError(error, normalized, 'file')
        if (mapped instanceof MyFilesError && mapped.code === 'not_found') return null
        if (!(mapped instanceof MyFilesError && mapped.code === 'not_a_file')) throw mapped
      }
      await parent.getDirectoryHandle(name)
      return dirEntry(normalized)
    },

    async readText(path) {
      return (await (await getFileHandle(path)).getFile()).text()
    },

    async readBytes(path) {
      return new Uint8Array(await (await (await getFileHandle(path)).getFile()).arrayBuffer())
    },

    async write(path: string, data: MyFilesData, options: WriteOptions = {}) {
      const segments = splitPath(path)
      const normalized = segments.join('/')
      if (!segments.length) throw new MyFilesError('not_a_file', normalized)
      const dir = await getDir(segments.slice(0, -1), true)
      let handle: FileSystemFileHandle
      try {
        handle = await dir.getFileHandle(segments[segments.length - 1], { create: true })
      } catch (error) {
        throw mapError(error, normalized, 'file')
      }
      await writeFile(handle, data, normalized)
      const lastModified = options.lastModified ?? Date.now()
      record({ type: 'set', path: normalized, lastModified })
      const file = await handle.getFile()
      return { path: normalized, name: baseName(normalized), kind: 'file', size: file.size, lastModified }
    },

    async mkdir(path) {
      await getDir(splitPath(path), true)
    },

    async delete(path) {
      const segments = splitPath(path)
      const normalized = segments.join('/')
      if (!segments.length) throw new MyFilesError('invalid_path', normalized)
      const parent = await getDir(segments.slice(0, -1), false)
      try {
        await parent.removeEntry(segments[segments.length - 1], { recursive: true })
      } catch (error) {
        throw mapError(error, normalized, 'file')
      }
      record({ type: 'delete', path: normalized })
    },

    async clear() {
      const dir = await base()
      const names: string[] = []
      for await (const [name] of (dir as IterableDirectory).entries()) names.push(name)
      for (const name of names) await dir.removeEntry(name, { recursive: true })
      pending = [{ type: 'clear' }]
      await flush()
    },

    flush,
  }
}

let defaultStore: MyFilesStore | null = null

/** The app's My files store, or null when the browser has no OPFS. */
export const getMyFilesStore = (): MyFilesStore | null => {
  if (!isOpfsSupported()) return null
  return (defaultStore ??= createOpfsStore())
}
