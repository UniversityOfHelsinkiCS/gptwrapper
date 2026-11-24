import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMyFilesStore } from '../MyFiles/MyFilesStoreContext'
import { readMinimized, readOpenFile, writeMinimized, writeOpenFile } from './viewerPersistence'

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
  /** The open file, or null when the viewer is closed. A minimized viewer still has its file open. */
  target: ViewerTarget | null
  /** Whether the open file is minimized to the rail. The active file (shown to the user) is `target` when this is false. */
  minimized: boolean
  /**
   * Whether `target` was reopened from storage (on load, or on switching back to a chat context) rather than opened by
   * the user. A restored file does not take the focus.
   */
  restored: boolean
  /**
   * Opens a file, at `page` / `heading` when given, and expands a minimized viewer. Each call is a new navigation:
   * opening the file that is already open with another page or heading jumps there.
   */
  open: (target: ViewerTarget) => void
  /** Minimizes the viewer to the rail, keeping its file. */
  minimize: () => void
  /** Expands a minimized viewer back to its file. */
  expand: () => void
  close: () => void
}

interface ViewerState {
  context: string | undefined
  target: ViewerTarget | null
  minimized: boolean
  restored: boolean
}

const closedState = (context: string | undefined): ViewerState => ({ context, target: null, minimized: false, restored: false })

const FileViewerContext = createContext<FileViewerControls | null>(null)

/**
 * Holds the file open in the viewer. The My files dialog (in the sidebar) opens files and the chat view shows them, so
 * both read it from here. With `available` false (embedded mode, no OPFS) nothing is provided and the viewer stays off.
 * The open file and whether it is minimized are per `chatContext` (a course id, or `general`): they are remembered, and
 * the file is reopened on load (or when switching back to the context) if it still exists in My files. Without
 * `chatContext` nothing is remembered.
 */
export const FileViewerProvider = ({ available, chatContext, children }: { available: boolean; chatContext?: string; children: ReactNode }) => {
  const store = useMyFilesStore()
  const [state, setState] = useState<ViewerState>(() => closedState(chatContext))
  // Another chat context starts closed, until its remembered file is found.
  if (state.context !== chatContext) setState(closedState(chatContext))
  const current = state.context === chatContext ? state : closedState(chatContext)

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
        writeMinimized(chatContext, false)
        return
      }
      // Unless a file was opened meanwhile.
      setState((prev) =>
        prev.context === chatContext && !prev.target ? { context: chatContext, target: { path }, minimized: readMinimized(chatContext), restored: true } : prev,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [available, store, chatContext])

  const open = useCallback(
    (next: ViewerTarget) => {
      setState({ context: chatContext, target: next, minimized: false, restored: false })
      if (chatContext) {
        writeOpenFile(chatContext, next.path)
        writeMinimized(chatContext, false)
      }
    },
    [chatContext],
  )
  const setMinimized = useCallback(
    (minimized: boolean) => {
      setState((prev) => (prev.context === chatContext && prev.target ? { ...prev, minimized } : prev))
      if (chatContext) writeMinimized(chatContext, minimized)
    },
    [chatContext],
  )
  const minimize = useCallback(() => setMinimized(true), [setMinimized])
  const expand = useCallback(() => setMinimized(false), [setMinimized])
  const close = useCallback(() => {
    setState(closedState(chatContext))
    if (chatContext) {
      writeOpenFile(chatContext, null)
      writeMinimized(chatContext, false)
    }
  }, [chatContext])
  const { target, minimized, restored } = current
  const value = useMemo(() => ({ target, minimized, restored, open, minimize, expand, close }), [target, minimized, restored, open, minimize, expand, close])
  return <FileViewerContext.Provider value={available ? value : null}>{children}</FileViewerContext.Provider>
}

/** The viewer controls, or null when the viewer is not available here. */
export const useFileViewer = (): FileViewerControls | null => useContext(FileViewerContext)
