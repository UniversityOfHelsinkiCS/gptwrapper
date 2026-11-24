import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('react-syntax-highlighter', () => ({ PrismAsync: () => null }))

import en from '../../locales/en.json'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import FileViewer from './FileViewer'
import { FileViewerProvider, useFileViewer } from './FileViewerContext'
import { readChatFiles, writeChatFiles } from './viewerPersistence'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => localStorage.clear())
afterEach(cleanup)

/** The viewer wired to the context as the chat view does it. */
const Viewer = ({ store }: { store: MyFilesStore }) => {
  const viewer = useFileViewer()
  if (!viewer?.target) return <output data-testid="closed" />
  return (
    <FileViewer
      store={store}
      target={viewer.target}
      focusOnOpen={viewer.focusOnOpen}
      files={viewer.files}
      onSwitchFile={(path) => viewer.open({ path })}
      onRemoveFile={viewer.remove}
    />
  )
}

const renderViewer = async (store: MyFilesStore, files: string[]) => {
  writeChatFiles('course-1', files)
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <FileViewerProvider available chatContext="course-1">
          <Viewer store={store} />
        </FileViewerProvider>
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )
  await screen.findByTestId('file-viewer')
}

const storeWith = async (files: Record<string, string>) => {
  const store = createMemoryStore()
  for (const [path, text] of Object.entries(files)) await store.write(path, text)
  return store
}

const filesButton = () => screen.getByTestId('file-viewer-files-button')
const openMenu = () => {
  fireEvent.click(filesButton())
  return screen.getByRole('menu', { name: 'Files in this chat' })
}
const items = (menu: HTMLElement) => within(menu).getAllByRole('menuitemradio')
const shownPath = () => screen.getByTestId('file-viewer').getAttribute('data-path')

describe('FileViewer file menu', () => {
  test('with one file the name is plain heading text', async () => {
    const store = await storeWith({ 'Course/a.md': 'A' })
    await renderViewer(store, ['Course/a.md'])
    expect(screen.getByRole('heading', { level: 2, name: 'a.md' })).toBeTruthy()
    expect(screen.queryByTestId('file-viewer-files-button')).toBe(null)
  })

  test('lists the files with their folders, the open one checked, and switches to the picked one', async () => {
    const store = await storeWith({ 'Course/a.md': 'A', 'b.md': 'B' })
    await renderViewer(store, ['Course/a.md', 'b.md'])
    await screen.findByText('A')
    // The region is still named by the file name.
    expect(screen.getByRole('region', { name: 'a.md' })).toBeTruthy()
    expect(filesButton().getAttribute('aria-haspopup')).toBe('menu')

    const menu = openMenu()
    expect(filesButton().getAttribute('aria-expanded')).toBe('true')
    const [first, second] = items(menu)
    expect(first.textContent).toContain('a.md')
    expect(first.textContent).toContain('Course')
    expect(first.getAttribute('aria-checked')).toBe('true')
    expect(second.textContent).toContain('b.md')
    expect(second.textContent).toContain('My files')
    expect(second.getAttribute('aria-checked')).toBe('false')
    expect(first.getAttribute('aria-keyshortcuts')).toBe('Delete')
    expect(document.getElementById(menu.getAttribute('aria-describedby')!)?.textContent).toBe('Press Delete to remove the focused file from this chat.')

    fireEvent.click(second)
    await screen.findByText('B')
    expect(shownPath()).toBe('b.md')
    // The picked file is now the newest, and has the focus.
    expect(readChatFiles('course-1')).toEqual(['b.md', 'Course/a.md'])
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('file-viewer')))
  })

  test('removing files: another one with ✕, the open one with Delete (the next opens), the last one closes the viewer', async () => {
    const store = await storeWith({ 'a.md': 'A', 'b.md': 'B', 'c.md': 'C' })
    await renderViewer(store, ['a.md', 'b.md', 'c.md'])
    await screen.findByText('A')
    let menu = openMenu()

    // The ✕ is for the mouse only: hidden from assistive technology and out of the tab order, so the arrow keys work.
    const remove = within(items(menu)[2]).getByTestId('file-viewer-files-remove')
    expect(remove.getAttribute('aria-hidden')).toBe('true')
    expect(remove.getAttribute('tabindex')).toBe('-1')
    fireEvent.click(remove)
    expect(readChatFiles('course-1')).toEqual(['a.md', 'b.md'])
    expect(shownPath()).toBe('a.md')
    // The menu stays open for removing more.
    menu = screen.getByRole('menu')
    expect(items(menu)).toHaveLength(2)

    fireEvent.keyDown(items(menu)[0], { key: 'Delete' })
    await screen.findByText('B')
    expect(shownPath()).toBe('b.md')
    expect(readChatFiles('course-1')).toEqual(['b.md'])
    menu = screen.getByRole('menu')
    expect(items(menu)).toHaveLength(1)
    expect(items(menu)[0].getAttribute('aria-checked')).toBe('true')

    fireEvent.keyDown(items(menu)[0], { key: 'Backspace' })
    expect(await screen.findByTestId('closed')).toBeTruthy()
    expect(readChatFiles('course-1')).toEqual([])
  })

  test('closing the menu with one file left focuses the viewer, as the menu button is gone', async () => {
    const store = await storeWith({ 'a.md': 'A', 'b.md': 'B' })
    await renderViewer(store, ['a.md', 'b.md'])
    await screen.findByText('A')
    const menu = openMenu()
    fireEvent.keyDown(items(menu)[1], { key: 'Delete' })
    expect(screen.queryByTestId('file-viewer-files-button')).toBe(null)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('file-viewer')))
  })

  test('closing the menu returns the focus to its button', async () => {
    const store = await storeWith({ 'a.md': 'A', 'b.md': 'B' })
    await renderViewer(store, ['a.md', 'b.md'])
    await screen.findByText('A')
    const menu = openMenu()
    fireEvent.keyDown(menu, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(filesButton()))
  })
})
