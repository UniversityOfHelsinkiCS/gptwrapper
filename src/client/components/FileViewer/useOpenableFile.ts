import { useEffect, useState } from 'react'
import { useMyFilesStore } from '../MyFiles/MyFilesStoreContext'
import { useFileViewer, type FileViewerControls } from './FileViewerContext'
import { viewerFileKind } from './fileKind'

/**
 * The viewer's `open` when the file at `path` can be opened in it: the viewer is available here, it can show the file
 * (pdf, md, txt) and the file is still in My files. Null otherwise, and while that is being checked. No path, no file.
 */
export const useOpenableFile = (path: string | null | undefined): FileViewerControls['open'] | null => {
  const store = useMyFilesStore()
  const open = useFileViewer()?.open
  const viewable = !!path && viewerFileKind(path) !== null
  const [exists, setExists] = useState<string | null>(null)
  useEffect(() => {
    setExists(null)
    if (!store || !open || !path || !viewable) return
    let cancelled = false
    store.stat(path).then(
      (entry) => !cancelled && entry?.kind === 'file' && setExists(path),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [store, open, path, viewable])
  return open && path && exists === path ? open : null
}
