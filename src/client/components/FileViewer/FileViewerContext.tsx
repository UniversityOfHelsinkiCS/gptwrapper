import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMyFilesStore } from '../MyFiles/MyFilesStoreContext'
import { readOpenFile, writeOpenFile } from './viewerPersistence'

/**
 * What to show in the viewer: a My files path, optionally with a position to open it at (a PDF page or a Markdown
 * heading). Without one, the file opens where it was last read.
 */
export interface ViewerTarget {
  path: string
  page?: number
  heading?: string
}

export interface FileViewerControls {
  /** The open file, or null when the viewer is closed. */
  target: ViewerTarget | null
  /**
   * Opens a file, at `page` / `heading` when given. Each call is a new navigation: opening the file that is already
   * open with another page or heading jumps there.
   */
  open: (target: ViewerTarget) => void
  close: () => void
}

const FileViewerContext = createContext<FileViewerControls | null>(null)

/**
 * Holds the file open in the viewer. The My files dialog (in the sidebar) opens files and the chat view shows them, so
 * both read it from here. With `available` false (embedded mode, no OPFS) nothing is provided and the viewer stays off.
 * The open file is per `chatContext` (a course id, or `general`): it is remembered, and reopened on load (or when
 * switching back to the context) if it still exists in My files. Without `chatContext` nothing is remembered.
 */
export const FileViewerProvider = ({ available, chatContext, children }: { available: boolean; chatContext?: string; children: ReactNode }) => {
  const store = useMyFilesStore()
  const [state, setState] = useState<{ context: string | undefined; target: ViewerTarget | null }>({ context: chatContext, target: null })
  // Another chat context starts closed, until its remembered file is found.
  if (state.context !== chatContext) setState({ context: chatContext, target: null })
  const target = state.context === chatContext ? state.target : null

  useEffect(() => {
    if (!available || !store || !chatContext) return
    const path = readOpenFile(chatContext)
    if (!path) return
    let cancelled = false
    void (async () => {
      const entry = await store.stat(path).catch(() => null)
      if (cancelled) return
      if (!entry || entry.kind !== 'file') {
        writeOpenFile(chatContext, null)
        return
      }
      // Unless a file was opened meanwhile.
      setState((prev) => (prev.context === chatContext && !prev.target ? { context: chatContext, target: { path } } : prev))
    })()
    return () => {
      cancelled = true
    }
  }, [available, store, chatContext])

  const open = useCallback(
    (next: ViewerTarget) => {
      setState({ context: chatContext, target: next })
      if (chatContext) writeOpenFile(chatContext, next.path)
    },
    [chatContext],
  )
  const close = useCallback(() => {
    setState({ context: chatContext, target: null })
    if (chatContext) writeOpenFile(chatContext, null)
  }, [chatContext])
  const value = useMemo(() => ({ target, open, close }), [target, open, close])
  return <FileViewerContext.Provider value={available ? value : null}>{children}</FileViewerContext.Provider>
}

/** The viewer controls, or null when the viewer is not available here. */
export const useFileViewer = (): FileViewerControls | null => useContext(FileViewerContext)
