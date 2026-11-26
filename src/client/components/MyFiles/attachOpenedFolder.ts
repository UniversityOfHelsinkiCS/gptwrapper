import { useEffect, useRef } from 'react'
import { type TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { MAX_ATTACHED_FOLDERS } from '../../../shared/fileTools'
import { isReservedPath, splitPath, topLevelFolder } from '../../util/myFiles/paths'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import type { FileViewerControls } from '../FileViewer/FileViewerContext'
import { folderLabel } from './folderLabel'

/**
 * The folder to attach to the chat when the user opens `path` in the viewer: its top-level My files folder, so that
 * the agent can read the rest of it. None for a file at the root, in `Outputs/` or `Agent notes/` (always visible to
 * the agent), in a folder already attached, or when the list is full.
 */
export const folderToAttach = (path: string, attachedFolders: readonly string[]): string | null => {
  if (splitPath(path).length < 2 || isReservedPath(path)) return null
  const folder = topLevelFolder(path)
  if (attachedFolders.includes(folder) || attachedFolders.length >= MAX_ATTACHED_FOLDERS) return null
  return folder
}

/**
 * The folders to attach for the files of `paths` (the files quoted in a message), in order and without repeats, as
 * many as fit next to `attachedFolders`.
 */
export const foldersToAttach = (paths: readonly string[], attachedFolders: readonly string[]): string[] =>
  paths.reduce<string[]>((added, path) => {
    const folder = folderToAttach(path, [...attachedFolders, ...added])
    return folder ? [...added, folder] : added
  }, [])

/** Tells screen reader users that `folder` was attached to the chat. */
export const announceFolderAttached = (t: TFunction, folder: string) =>
  announceToScreenReader(t('myFiles:folderAttachedOnOpen', { name: folderLabel(t, folder), interpolation: { escapeValue: false } }))

/**
 * Attaches the folder of each file the user opens in the viewer (from My files, a quote card or an agent tool link),
 * and announces it. Only user opens count (`focusOnOpen`): a file restored on load or on switching back to a chat was
 * opened, and its folder attached, before, and a folder detached since stays detached.
 */
export const useAttachOpenedFolder = (viewer: FileViewerControls | null, attachedFolders: string[], setAttachedFolders: (folders: string[]) => void) => {
  const { t } = useTranslation()
  const latest = useRef({ attachedFolders, setAttachedFolders, t })
  latest.current = { attachedFolders, setAttachedFolders, t }
  const handled = useRef<FileViewerControls['target']>(null)
  const target = viewer?.target ?? null
  const userOpened = !!viewer?.focusOnOpen

  useEffect(() => {
    // Every `open()` makes a new target, so one already handled is the same open seen again.
    if (!target || !userOpened || handled.current === target) return
    handled.current = target
    const { attachedFolders, setAttachedFolders, t } = latest.current
    const folder = folderToAttach(target.path, attachedFolders)
    if (!folder) return
    setAttachedFolders([...attachedFolders, folder])
    announceFolderAttached(t, folder)
  }, [target, userOpened])
}
