import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** What to show in the viewer: a My files path, later with a position to open it at (a PDF page or a Markdown heading). */
export interface ViewerTarget {
  path: string
  page?: number
  heading?: string
}

export interface FileViewerControls {
  /** The open file, or null when the viewer is closed. */
  target: ViewerTarget | null
  open: (target: ViewerTarget) => void
  close: () => void
}

const FileViewerContext = createContext<FileViewerControls | null>(null)

/**
 * Holds the file open in the viewer. The My files dialog (in the sidebar) opens files and the chat view shows them, so
 * both read it from here. With `available` false (embedded mode, no OPFS) nothing is provided and the viewer stays off.
 */
export const FileViewerProvider = ({ available, children }: { available: boolean; children: ReactNode }) => {
  const [target, setTarget] = useState<ViewerTarget | null>(null)
  const open = useCallback((next: ViewerTarget) => setTarget(next), [])
  const close = useCallback(() => setTarget(null), [])
  const value = useMemo(() => ({ target, open, close }), [target, open, close])
  return <FileViewerContext.Provider value={available ? value : null}>{children}</FileViewerContext.Provider>
}

/** The viewer controls, or null when the viewer is not available here. */
export const useFileViewer = (): FileViewerControls | null => useContext(FileViewerContext)
