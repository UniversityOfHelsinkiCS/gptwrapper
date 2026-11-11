import { MyFilesError } from './store'

/**
 * Paths in My files are relative, '/'-separated and normalised: no leading or trailing slash, no empty, '.' or '..'
 * segments. The root is ''. Every store method normalises its path argument with `normalizePath`, so a tool executor
 * can pass what the model sent and get a refusal (`invalid_path`) instead of an escape.
 */

/** Top-level folders that the app (later the agent) fills. The picker can neither upload into them nor overwrite them. */
export const RESERVED_FOLDERS = ['Outputs', 'Agent notes'] as const
export type ReservedFolder = (typeof RESERVED_FOLDERS)[number]

export const OUTPUTS_FOLDER: ReservedFolder = 'Outputs'
export const AGENT_NOTES_FOLDER: ReservedFolder = 'Agent notes'

const MAX_SEGMENT_LENGTH = 255

/** Splits and validates a path. Throws `MyFilesError('invalid_path')` for '..', backslashes, control characters and over-long names. */
export const splitPath = (path: string): string[] => {
  if (typeof path !== 'string') throw new MyFilesError('invalid_path', String(path))
  const segments = path.split('/').filter((segment) => segment !== '' && segment !== '.')
  for (const segment of segments) {
    // eslint-disable-next-line no-control-regex
    if (segment === '..' || segment.includes('\\') || /[\u0000-\u001f]/.test(segment) || segment.length > MAX_SEGMENT_LENGTH) {
      throw new MyFilesError('invalid_path', path)
    }
  }
  return segments
}

export const normalizePath = (path: string): string => splitPath(path).join('/')

export const joinPath = (...parts: string[]): string => normalizePath(parts.filter(Boolean).join('/'))

export const parentPath = (path: string): string => splitPath(path).slice(0, -1).join('/')

export const baseName = (path: string): string => splitPath(path).at(-1) ?? ''

/** The first segment, or '' for the root. */
export const topLevelFolder = (path: string): string => splitPath(path)[0] ?? ''

/** True when `path` is `dir` itself or inside it. Both are normalised; the root '' contains everything. */
export const isWithin = (path: string, dir: string): boolean => {
  const p = normalizePath(path)
  const d = normalizePath(dir)
  return d === '' || p === d || p.startsWith(`${d}/`)
}

/**
 * True when the path is a reserved folder or inside one. Compared case-insensitively, because some file systems the
 * student uploads from are, so an uploaded `outputs/` folder can not end up next to (or on top of) `Outputs/`.
 */
export const isReservedPath = (path: string): boolean => {
  const top = topLevelFolder(path).toLowerCase()
  return RESERVED_FOLDERS.some((folder) => folder.toLowerCase() === top)
}
