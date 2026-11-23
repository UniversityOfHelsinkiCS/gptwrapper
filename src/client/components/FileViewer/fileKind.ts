/** The kinds of My files files the viewer can show. PDF comes later. */
export type ViewerFileKind = 'markdown' | 'text'

/** Text files larger than this are not rendered (about 5 MB). */
export const MAX_VIEWER_TEXT_BYTES = 5 * 1024 * 1024

/** The viewer kind for a path by its extension, or null when the viewer cannot show it. */
export const viewerFileKind = (path: string): ViewerFileKind | null => {
  const extension = path.toLowerCase().match(/\.([^./]+)$/)?.[1]
  if (extension === 'md') return 'markdown'
  if (extension === 'txt') return 'text'
  return null
}
