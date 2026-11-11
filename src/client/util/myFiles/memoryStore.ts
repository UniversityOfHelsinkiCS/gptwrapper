import { baseName, isWithin, normalizePath, parentPath, splitPath } from './paths'
import { MyFilesError, toBytes, type MyFilesData, type MyFilesEntry, type MyFilesStore, type WriteOptions } from './store'

type Node = { kind: 'directory' } | { kind: 'file'; bytes: Uint8Array; lastModified: number }

/** In-memory `MyFilesStore` for tests. Behaves like the OPFS store, including its errors. */
export const createMemoryStore = (): MyFilesStore => {
  // Keyed by normalised path; '' is the root directory.
  const nodes = new Map<string, Node>([['', { kind: 'directory' }]])

  const entry = (path: string, node: Node): MyFilesEntry =>
    node.kind === 'file'
      ? { path, name: baseName(path), kind: 'file', size: node.bytes.byteLength, lastModified: node.lastModified }
      : { path, name: baseName(path), kind: 'directory', size: 0, lastModified: 0 }

  const getFile = (path: string) => {
    const normalized = normalizePath(path)
    const node = nodes.get(normalized)
    if (!node) throw new MyFilesError('not_found', normalized)
    if (node.kind !== 'file') throw new MyFilesError('not_a_file', normalized)
    return node
  }

  const mkdirSync = (path: string) => {
    const segments = splitPath(path)
    for (let i = 1; i <= segments.length; i++) {
      const dir = segments.slice(0, i).join('/')
      const node = nodes.get(dir)
      if (node?.kind === 'file') throw new MyFilesError('not_a_directory', dir)
      if (!node) nodes.set(dir, { kind: 'directory' })
    }
  }

  return {
    async list(dir = '', { recursive = false } = {}) {
      const normalized = normalizePath(dir)
      const node = nodes.get(normalized)
      if (!node) throw new MyFilesError('not_found', normalized)
      if (node.kind !== 'directory') throw new MyFilesError('not_a_directory', normalized)
      return [...nodes.entries()]
        .filter(([path]) => path !== normalized && isWithin(path, normalized) && (recursive || parentPath(path) === normalized))
        .map(([path, child]) => entry(path, child))
        .sort((a, b) => a.path.localeCompare(b.path))
    },

    async stat(path) {
      const normalized = normalizePath(path)
      const node = nodes.get(normalized)
      return node ? entry(normalized, node) : null
    },

    async readText(path) {
      return new TextDecoder().decode(getFile(path).bytes)
    },

    async readBytes(path) {
      return getFile(path).bytes.slice()
    },

    async write(path: string, data: MyFilesData, options: WriteOptions = {}) {
      const normalized = normalizePath(path)
      if (normalized === '' || nodes.get(normalized)?.kind === 'directory') throw new MyFilesError('not_a_file', normalized)
      mkdirSync(parentPath(normalized))
      const node: Node = { kind: 'file', bytes: (await toBytes(data)).slice(), lastModified: options.lastModified ?? Date.now() }
      nodes.set(normalized, node)
      return entry(normalized, node)
    },

    async mkdir(path) {
      mkdirSync(path)
    },

    async delete(path) {
      const normalized = normalizePath(path)
      if (normalized === '') throw new MyFilesError('invalid_path', normalized)
      if (!nodes.has(normalized)) throw new MyFilesError('not_found', normalized)
      for (const key of [...nodes.keys()]) {
        if (isWithin(key, normalized)) nodes.delete(key)
      }
    },

    async clear() {
      nodes.clear()
      nodes.set('', { kind: 'directory' })
    },

    async flush() {},
  }
}
