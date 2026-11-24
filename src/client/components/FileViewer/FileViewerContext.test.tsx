import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { activeViewerFile, FileViewerProvider, useFileViewer, type FileViewerControls, type ViewerPositionReader } from './FileViewerContext'
import { MAX_VIEWER_FILE_HEADING_LENGTH, MAX_VIEWER_FILE_PATH_LENGTH, type ViewerFile } from '@shared/viewerFile'
import { chatFilesStorageKey, openFileStorageKey, readChatFiles, readMinimized, writeChatFiles, writeMinimized } from './viewerPersistence'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const Controls = () => {
  const viewer = useFileViewer()
  return (
    <>
      <output data-testid="target">{viewer?.target?.path ?? ''}</output>
      <output data-testid="files">{viewer?.files.join(',') ?? ''}</output>
      <output data-testid="state">{viewer ? `${viewer.minimized ? 'minimized' : 'expanded'} ${viewer.focusOnOpen ? 'focus' : 'no-focus'}` : ''}</output>
      {['a.md', 'b.md', 'c.md'].map((path) => (
        <button key={path} data-testid={`open-${path}`} onClick={() => viewer?.open({ path })} />
      ))}
      {['a.md', 'b.md', 'c.md'].map((path) => (
        <button key={path} data-testid={`remove-${path}`} onClick={() => viewer?.remove(path)} />
      ))}
      <output data-testid="active">{JSON.stringify(activeViewerFile(viewer) ?? null)}</output>
      <button data-testid="minimize" onClick={() => viewer?.minimize()} />
      <button data-testid="expand" onClick={() => viewer?.expand()} />
    </>
  )
}

const ui = (store: MyFilesStore, chatContext: string, available = true) => (
  <MyFilesStoreProvider store={store}>
    <FileViewerProvider available={available} chatContext={chatContext}>
      <Controls />
    </FileViewerProvider>
  </MyFilesStoreProvider>
)

const target = () => screen.getByTestId('target').textContent
const files = () => screen.getByTestId('files').textContent
const state = () => screen.getByTestId('state').textContent
const click = (testId: string) => fireEvent.click(screen.getByTestId(testId))

const storeWith = async (...paths: string[]) => {
  const store = createMemoryStore()
  for (const path of paths) await store.write(path, 'text')
  return store
}

describe('FileViewerProvider persistence', () => {
  test('remembers the files per chat context and reopens the one shown last', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', { files: ['a.md', 'b.md'], active: 'a.md' })
    const { rerender } = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    expect(files()).toBe('a.md,b.md')

    // Another context starts with its own (here: no) files.
    rerender(ui(store, 'general'))
    expect(target()).toBe('')
    click('open-b.md')
    expect(target()).toBe('b.md')
    expect(readChatFiles('general')).toEqual({ files: ['b.md'], active: 'b.md' })
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md', 'b.md'], active: 'a.md' })

    rerender(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
  })

  test('files no longer in My files are dropped quietly, and with none left the viewer stays closed', async () => {
    const store = await storeWith('a.md', 'b.md', 'folder/file.md')
    // The shown file is gone: the next one is shown.
    writeChatFiles('course-1', { files: ['a.md', 'gone.md', 'folder', 'b.md'], active: 'gone.md' })
    const first = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(files()).toBe('a.md,b.md')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md', 'b.md'], active: 'b.md' })
    first.unmount()

    // The last one is gone: the previous one is shown.
    writeChatFiles('course-1', { files: ['a.md', 'b.md', 'gone.md'], active: 'gone.md' })
    const second = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(files()).toBe('a.md,b.md')
    second.unmount()

    writeChatFiles('course-2', { files: ['gone.md'], active: 'gone.md' })
    render(ui(store, 'course-2'))
    await waitFor(() => expect(readChatFiles('course-2')).toEqual({ files: [], active: null }))
    expect(target()).toBe('')
  })

  test('the open file remembered before the file list is read as its only file', async () => {
    const store = await storeWith('a.md')
    localStorage.setItem(openFileStorageKey('course-1'), 'a.md')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    click('open-b.md')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md', 'b.md'], active: 'b.md' })
    expect(localStorage.getItem(openFileStorageKey('course-1'))).toBe(null)
  })

  test('a list stored newest first without the shown file is reordered, its first file reopened', async () => {
    const store = await storeWith('a.md', 'b.md')
    localStorage.setItem(chatFilesStorageKey('course-1'), '["b.md","a.md"]')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(files()).toBe('a.md,b.md')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md', 'b.md'], active: 'b.md' })
  })

  test('nothing is reopened when the viewer is not available', async () => {
    const store = await storeWith('a.md')
    writeChatFiles('course-1', { files: ['a.md'], active: 'a.md' })
    render(ui(store, 'course-1', false))
    await act(async () => {})
    expect(target()).toBe('')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md'], active: 'a.md' })
  })

  test('a restored file does not take the focus, an opened one does', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', { files: ['a.md'], active: 'a.md' })
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    expect(state()).toBe('expanded no-focus')
    click('open-b.md')
    expect(state()).toBe('expanded focus')
  })
})

describe('FileViewerProvider file list', () => {
  test('opening adds to the end, and opening a listed file keeps the order', async () => {
    const store = await storeWith('a.md', 'b.md', 'c.md')
    render(ui(store, 'course-1'))
    click('open-a.md')
    click('open-b.md')
    click('open-c.md')
    expect(files()).toBe('a.md,b.md,c.md')
    click('open-a.md')
    expect(files()).toBe('a.md,b.md,c.md')
    expect(target()).toBe('a.md')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md', 'b.md', 'c.md'], active: 'a.md' })
  })

  test('a file opened before the remembered ones are checked joins them', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', { files: ['a.md'], active: 'a.md' })
    render(ui(store, 'course-1'))
    click('open-b.md')
    await act(async () => {})
    expect(target()).toBe('b.md')
    expect(files()).toBe('a.md,b.md')
  })

  test('removing the open file opens the next one (or the previous) without the focus, removing the only one closes the viewer', async () => {
    const store = await storeWith('a.md', 'b.md', 'c.md')
    render(ui(store, 'course-1'))
    click('open-a.md')
    click('open-b.md')
    click('open-c.md')
    click('open-b.md')

    click('remove-b.md')
    expect(target()).toBe('c.md')
    expect(files()).toBe('a.md,c.md')
    expect(state()).toBe('expanded no-focus')

    click('remove-c.md')
    expect(target()).toBe('a.md')
    expect(readChatFiles('course-1')).toEqual({ files: ['a.md'], active: 'a.md' })

    click('minimize')
    click('remove-a.md')
    expect(target()).toBe('')
    expect(files()).toBe('')
    expect(readChatFiles('course-1')).toEqual({ files: [], active: null })
    expect(readMinimized('course-1')).toBe(false)
  })
})

describe('FileViewerProvider minimize', () => {
  test('minimizes and expands the open file, remembered per chat context', async () => {
    const store = await storeWith('a.md', 'b.md')
    const { rerender } = render(ui(store, 'course-1'))
    click('open-b.md')
    click('minimize')
    expect(target()).toBe('b.md')
    expect(state()).toBe('minimized focus')
    expect(readMinimized('course-1')).toBe(true)

    rerender(ui(store, 'general'))
    expect(state()).toBe('expanded no-focus')
    expect(readMinimized('general')).toBe(false)

    rerender(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(state()).toBe('minimized no-focus')

    click('expand')
    expect(state()).toBe('expanded no-focus')
    expect(readMinimized('course-1')).toBe(false)
  })

  test('opening a file expands a minimized viewer', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', { files: ['a.md'], active: 'a.md' })
    writeMinimized('course-1', true)
    render(ui(store, 'course-1'))
    await waitFor(() => expect(state()).toBe('minimized no-focus'))
    click('open-b.md')
    expect(target()).toBe('b.md')
    expect(state()).toBe('expanded focus')
    expect(readMinimized('course-1')).toBe(false)
  })

  test('minimizing without an open file does nothing', async () => {
    const store = await storeWith('a.md')
    render(ui(store, 'course-1'))
    click('minimize')
    expect(readMinimized('course-1')).toBe(false)
  })
})

describe('activeViewerFile', () => {
  /** Registers a position reader like the shown FileViewer does, and reads the active file on click (as sending does). */
  const Probe = ({ reader }: { reader: ViewerPositionReader }) => {
    const viewer = useFileViewer()
    const setPositionReader = viewer?.setPositionReader
    useEffect(() => {
      setPositionReader?.(reader)
      return () => setPositionReader?.(null)
    }, [setPositionReader, reader])
    return <button data-testid="read" onClick={(event) => (event.currentTarget.dataset.read = JSON.stringify(activeViewerFile(viewer) ?? null))} />
  }
  const read = () => {
    click('read')
    return JSON.parse(screen.getByTestId('read').dataset.read!)
  }
  const withProbe = (store: MyFilesStore, reader: ViewerPositionReader) => (
    <MyFilesStoreProvider store={store}>
      <FileViewerProvider available chatContext="course-1">
        <Controls />
        <Probe reader={reader} />
      </FileViewerProvider>
    </MyFilesStoreProvider>
  )

  test('is the open file while it is not minimized', async () => {
    const store = await storeWith('a.md')
    render(ui(store, 'course-1'))
    expect(JSON.parse(screen.getByTestId('active').textContent!)).toBe(null)
    click('open-a.md')
    expect(JSON.parse(screen.getByTestId('active').textContent!)).toEqual({ path: 'a.md' })
    click('minimize')
    expect(JSON.parse(screen.getByTestId('active').textContent!)).toBe(null)
    click('expand')
    expect(JSON.parse(screen.getByTestId('active').textContent!)).toEqual({ path: 'a.md' })
  })

  test('has the position the viewer reads at that moment, only for the open file', async () => {
    const store = await storeWith('a.md', 'b.md')
    let position = { path: 'a.md', heading: 'Intro' }
    const reader = () => position
    render(withProbe(store, reader))
    click('open-a.md')
    expect(read()).toEqual({ path: 'a.md', heading: 'Intro' })
    position = { path: 'a.md', heading: 'Part 2' }
    expect(read()).toEqual({ path: 'a.md', heading: 'Part 2' })
    // A reader still telling about the previous file is not used.
    click('open-b.md')
    expect(read()).toEqual({ path: 'b.md' })
  })

  test('cuts a long heading and leaves out a path too long to send', () => {
    const controls = (path: string, position: ViewerFile): FileViewerControls =>
      ({ target: { path }, minimized: false, readPosition: () => position }) as unknown as FileViewerControls
    const heading = 'h'.repeat(MAX_VIEWER_FILE_HEADING_LENGTH + 10)
    expect(activeViewerFile(controls('a.md', { path: 'a.md', heading }))).toEqual({ path: 'a.md', heading: heading.slice(0, MAX_VIEWER_FILE_HEADING_LENGTH) })
    const longPath = 'a'.repeat(MAX_VIEWER_FILE_PATH_LENGTH + 1)
    expect(activeViewerFile(controls(longPath, { path: longPath }))).toBe(undefined)
  })
})
