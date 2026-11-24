import { cleanup, renderHook } from '@testing-library/react'
import i18next from 'i18next'
import type { ReactNode } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../common/accessibility/SnackbarAnnouncer', () => ({ announceToScreenReader: vi.fn() }))

import { MAX_ATTACHED_FOLDERS } from '../../../shared/fileTools'
import en from '../../locales/en.json'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import type { FileViewerControls, ViewerTarget } from '../FileViewer/FileViewerContext'
import { folderToAttach, useAttachOpenedFolder } from './attachOpenedFolder'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => vi.mocked(announceToScreenReader).mockClear())
afterEach(cleanup)

const fullList = Array.from({ length: MAX_ATTACHED_FOLDERS }, (_, i) => `Folder ${i}`)

describe('folderToAttach', () => {
  test('is the top-level folder of a file in a folder, also deeper down', () => {
    expect(folderToAttach('Course notes/lecture.md', [])).toBe('Course notes')
    expect(folderToAttach('Course notes/week1/lecture.md', ['Thesis'])).toBe('Course notes')
  })

  test('is none for a root-level file', () => {
    expect(folderToAttach('loose.md', [])).toBeNull()
  })

  test('is none in Outputs and Agent notes, which the agent always sees', () => {
    expect(folderToAttach('Outputs/plan.md', [])).toBeNull()
    expect(folderToAttach('Agent notes/learner-profile.md', [])).toBeNull()
    expect(folderToAttach('outputs/plan.md', [])).toBeNull()
  })

  test('is none for a folder already attached', () => {
    expect(folderToAttach('Course notes/lecture.md', ['Course notes'])).toBeNull()
  })

  test('is none when the list is full', () => {
    expect(folderToAttach('Course notes/lecture.md', fullList)).toBeNull()
    expect(folderToAttach('Course notes/lecture.md', fullList.slice(1))).toBe('Course notes')
  })
})

const viewerWith = (target: ViewerTarget | null, focusOnOpen: boolean) => ({ target, focusOnOpen }) as FileViewerControls

const wrapper = ({ children }: { children: ReactNode }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>

const renderAttach = (viewer: FileViewerControls | null, attachedFolders: string[] = []) => {
  const setAttachedFolders = vi.fn()
  const hook = renderHook(
    ({ viewer, attachedFolders }: { viewer: FileViewerControls | null; attachedFolders: string[] }) =>
      useAttachOpenedFolder(viewer, attachedFolders, setAttachedFolders),
    { wrapper, initialProps: { viewer, attachedFolders } },
  )
  return { ...hook, setAttachedFolders }
}

describe('useAttachOpenedFolder', () => {
  test('attaches the folder of a file the user opens and announces it', () => {
    const { setAttachedFolders } = renderAttach(viewerWith({ path: 'Course notes/lecture.md' }, true), ['Thesis'])
    expect(setAttachedFolders).toHaveBeenCalledWith(['Thesis', 'Course notes'])
    expect(announceToScreenReader).toHaveBeenCalledWith('Folder Course notes attached to the chat')
  })

  test('does nothing for a file restored on load', () => {
    const { setAttachedFolders } = renderAttach(viewerWith({ path: 'Course notes/lecture.md' }, false))
    expect(setAttachedFolders).not.toHaveBeenCalled()
    expect(announceToScreenReader).not.toHaveBeenCalled()
  })

  test('does nothing, and announces nothing, when there is no folder to attach', () => {
    const { setAttachedFolders } = renderAttach(viewerWith({ path: 'Outputs/plan.md' }, true))
    expect(setAttachedFolders).not.toHaveBeenCalled()
    expect(announceToScreenReader).not.toHaveBeenCalled()
  })

  test('does nothing without the viewer', () => {
    const { setAttachedFolders } = renderAttach(null)
    expect(setAttachedFolders).not.toHaveBeenCalled()
  })

  test('handles each open once: a folder detached later is not attached again until a file is opened again', () => {
    const target = { path: 'Course notes/lecture.md' }
    const { setAttachedFolders, rerender } = renderAttach(viewerWith(target, true))
    expect(setAttachedFolders).toHaveBeenCalledTimes(1)

    // Detached with the chip: the same open re-renders, nothing happens
    rerender({ viewer: viewerWith(target, true), attachedFolders: [] })
    expect(setAttachedFolders).toHaveBeenCalledTimes(1)

    // Opening it again (a new target) attaches it again
    rerender({ viewer: viewerWith({ path: 'Course notes/lecture.md', page: 2 }, true), attachedFolders: [] })
    expect(setAttachedFolders).toHaveBeenCalledTimes(2)
    expect(setAttachedFolders).toHaveBeenLastCalledWith(['Course notes'])
  })
})
