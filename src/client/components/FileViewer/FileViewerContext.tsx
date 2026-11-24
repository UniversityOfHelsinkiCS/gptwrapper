import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MAX_VIEWER_FILE_HEADING_LENGTH, MAX_VIEWER_FILE_PATH_LENGTH, type ViewerFile } from '@shared/viewerFile'
import { useMyFilesStore } from '../MyFiles/MyFilesStoreContext'
import { readChatFiles, readMinimized, withOpenedFile, writeChatFiles, writeMinimized } from './viewerPersistence'

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
  /** The files opened in this chat context, newest first (at most `MAX_CHAT_FILES`). The open file is the first one. */
  files: string[]
  /** Whether the open file is minimized to the rail. The active file (shown to the user) is `target` when this is false. */
  minimized: boolean
  /**
   * Whether the viewer takes the focus when it shows `target`: yes when the user opened it, no when it was restored
   * from storage (on load, or on switching back to a chat context) or became open by removing another file.
   */
  focusOnOpen: boolean
  /**
   * Opens a file, at `page` / `heading` when given, moves it to the front of `files` (adding it there) and expands a
   * minimized viewer. Each call is a new navigation: opening the file that is already open with another page or heading
   * jumps there.
   */
  open: (target: ViewerTarget) => void
  /** Minimizes the viewer to the rail, keeping its file. */
  minimize: () => void
  /** Expands a minimized viewer back to its file. */
  expand: () => void
  /**
   * Removes a file from `files`. Removing the open file opens the next one; removing the last one closes the viewer,
   * which is the only way to close it.
   */
  remove: (path: string) => void
  /**
   * Called by the shown viewer with a function that tells where in its file the user is (the PDF page, the Markdown
   * heading in view), or null when it goes away. Read only when a message is sent, so scrolling re-renders nothing.
   */
  setPositionReader: (reader: ViewerPositionReader | null) => void
  /** Where the user is in the file now, as the viewer of `path` tells it; just the path when it cannot. */
  readPosition: (path: string) => ViewerFile
}

/** Where the user is in the file the viewer shows. */
export type ViewerPositionReader = () => ViewerFile

interface ViewerState {
  context: string | undefined
  target: ViewerTarget | null
  files: string[]
  minimized: boolean
  focusOnOpen: boolean
}

/**
 * A chat context before its files are checked: closed, with the stored list so that a file opened meanwhile is added
 * to it.
 */
const initialState = (context: string | undefined, remembered: boolean): ViewerState => ({
  context,
  target: null,
  files: remembered && context ? readChatFiles(context) : [],
  minimized: false,
  focusOnOpen: false,
})

const FileViewerContext = createContext<FileViewerControls | null>(null)

/**
 * Holds the file open in the viewer and the files opened in the chat. The My files dialog (in the sidebar) and quote
 * cards open files and the chat view shows them, so all read it from here. With `available` false (embedded mode, no
 * OPFS) nothing is provided and the viewer stays off.
 * The files and whether the viewer is minimized are per `chatContext` (a course id, or `general`): they are remembered,
 * and on load (or when switching back to the context) files no longer in My files are dropped and the newest one is
 * reopened. Without `chatContext` nothing is remembered.
 */
export const FileViewerProvider = ({ available, chatContext, children }: { available: boolean; chatContext?: string; children: ReactNode }) => {
  const store = useMyFilesStore()
  const remembered = available && !!store
  const [state, setState] = useState<ViewerState>(() => initialState(chatContext, remembered))
  // Another chat context starts closed, until its remembered files are checked.
  if (state.context !== chatContext) setState(initialState(chatContext, remembered))
  const current = state.context === chatContext ? state : initialState(chatContext, false)
  const stateRef = useRef(current)
  stateRef.current = current

  useEffect(() => {
    if (!available || !store || !chatContext) return
    const stored = readChatFiles(chatContext)
    if (stored.length === 0) return
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(stored.map((path) => store.stat(path).catch(() => null)))
      if (cancelled) return
      const files = stored.filter((_, index) => entries[index]?.kind === 'file')
      // Unless a file was opened meanwhile.
      if (stateRef.current.context !== chatContext || stateRef.current.target) return
      writeChatFiles(chatContext, files)
      if (files.length === 0) {
        writeMinimized(chatContext, false)
        setState({ ...initialState(chatContext, false), files })
        return
      }
      setState({ context: chatContext, target: { path: files[0] }, files, minimized: readMinimized(chatContext), focusOnOpen: false })
    })()
    return () => {
      cancelled = true
    }
  }, [available, store, chatContext])

  const open = useCallback(
    (next: ViewerTarget) => {
      const files = withOpenedFile(stateRef.current.files, next.path)
      setState({ context: chatContext, target: next, files, minimized: false, focusOnOpen: true })
      if (chatContext) {
        writeChatFiles(chatContext, files)
        writeMinimized(chatContext, false)
      }
    },
    [chatContext],
  )
  const setMinimized = useCallback(
    (minimized: boolean) => {
      if (!stateRef.current.target) return
      setState((prev) => (prev.context === chatContext && prev.target ? { ...prev, minimized } : prev))
      if (chatContext) writeMinimized(chatContext, minimized)
    },
    [chatContext],
  )
  const minimize = useCallback(() => setMinimized(true), [setMinimized])
  const expand = useCallback(() => setMinimized(false), [setMinimized])
  const remove = useCallback(
    (path: string) => {
      const prev = stateRef.current
      const files = prev.files.filter((other) => other !== path)
      if (files.length === prev.files.length) return
      if (files.length === 0) {
        setState({ ...initialState(chatContext, false), files })
        if (chatContext) writeMinimized(chatContext, false)
      } else if (prev.target?.path === path) {
        setState({ ...prev, target: { path: files[0] }, files, focusOnOpen: false })
      } else {
        setState({ ...prev, files })
      }
      if (chatContext) writeChatFiles(chatContext, files)
    },
    [chatContext],
  )
  const positionReaderRef = useRef<ViewerPositionReader | null>(null)
  const setPositionReader = useCallback((reader: ViewerPositionReader | null) => {
    positionReaderRef.current = reader
  }, [])
  const readPosition = useCallback((path: string): ViewerFile => {
    const position = positionReaderRef.current?.()
    return position?.path === path ? position : { path }
  }, [])
  const { target, files, minimized, focusOnOpen } = current
  const value = useMemo(
    () => ({ target, files, minimized, focusOnOpen, open, minimize, expand, remove, setPositionReader, readPosition }),
    [target, files, minimized, focusOnOpen, open, minimize, expand, remove, setPositionReader, readPosition],
  )
  return <FileViewerContext.Provider value={available ? value : null}>{children}</FileViewerContext.Provider>
}

/** The viewer controls, or null when the viewer is not available here. */
export const useFileViewer = (): FileViewerControls | null => useContext(FileViewerContext)

/**
 * The file the user has open in the viewer now, with where they are in it, for a message being sent (`viewerFile`).
 * Undefined without an open file or while it is minimized. On narrow screens the chat covering the viewer ("Back to
 * chat") is not minimizing, so the file still counts. A path too long to send is left out, a long heading cut.
 */
export const activeViewerFile = (viewer: FileViewerControls | null): ViewerFile | undefined => {
  if (!viewer?.target || viewer.minimized) return undefined
  const { path, page, heading } = viewer.readPosition(viewer.target.path)
  if (path.length > MAX_VIEWER_FILE_PATH_LENGTH) return undefined
  const cutHeading = heading?.slice(0, MAX_VIEWER_FILE_HEADING_LENGTH)
  return { path, ...(page ? { page } : {}), ...(cutHeading ? { heading: cutHeading } : {}) }
}
