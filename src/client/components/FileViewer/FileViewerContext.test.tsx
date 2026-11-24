import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { FileViewerProvider, useFileViewer } from './FileViewerContext'
import { openFileStorageKey, readChatFiles, readMinimized, writeChatFiles, writeMinimized } from './viewerPersistence'

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
  test('remembers the files per chat context and reopens the newest', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', ['a.md', 'b.md'])
    const { rerender } = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    expect(files()).toBe('a.md,b.md')

    // Another context starts with its own (here: no) files.
    rerender(ui(store, 'general'))
    expect(target()).toBe('')
    click('open-b.md')
    expect(target()).toBe('b.md')
    expect(readChatFiles('general')).toEqual(['b.md'])
    expect(readChatFiles('course-1')).toEqual(['a.md', 'b.md'])

    rerender(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
  })

  test('files no longer in My files are dropped quietly, and with none left the viewer stays closed', async () => {
    const store = await storeWith('b.md', 'folder/file.md')
    writeChatFiles('course-1', ['gone.md', 'b.md', 'folder'])
    const { unmount } = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(files()).toBe('b.md')
    expect(readChatFiles('course-1')).toEqual(['b.md'])
    unmount()

    writeChatFiles('course-2', ['gone.md'])
    render(ui(store, 'course-2'))
    await waitFor(() => expect(readChatFiles('course-2')).toEqual([]))
    expect(target()).toBe('')
  })

  test('the open file remembered before the file list is read as its only file', async () => {
    const store = await storeWith('a.md')
    localStorage.setItem(openFileStorageKey('course-1'), 'a.md')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    click('open-b.md')
    expect(readChatFiles('course-1')).toEqual(['b.md', 'a.md'])
    expect(localStorage.getItem(openFileStorageKey('course-1'))).toBe(null)
  })

  test('nothing is reopened when the viewer is not available', async () => {
    const store = await storeWith('a.md')
    writeChatFiles('course-1', ['a.md'])
    render(ui(store, 'course-1', false))
    await act(async () => {})
    expect(target()).toBe('')
    expect(readChatFiles('course-1')).toEqual(['a.md'])
  })

  test('a restored file does not take the focus, an opened one does', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', ['a.md'])
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    expect(state()).toBe('expanded no-focus')
    click('open-b.md')
    expect(state()).toBe('expanded focus')
  })
})

describe('FileViewerProvider file list', () => {
  test('opening adds to the front, and opening a listed file moves it there', async () => {
    const store = await storeWith('a.md', 'b.md', 'c.md')
    render(ui(store, 'course-1'))
    click('open-a.md')
    click('open-b.md')
    click('open-c.md')
    expect(files()).toBe('c.md,b.md,a.md')
    click('open-a.md')
    expect(files()).toBe('a.md,c.md,b.md')
    expect(target()).toBe('a.md')
    expect(readChatFiles('course-1')).toEqual(['a.md', 'c.md', 'b.md'])
  })

  test('a file opened before the remembered ones are checked joins them', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeChatFiles('course-1', ['a.md'])
    render(ui(store, 'course-1'))
    click('open-b.md')
    await act(async () => {})
    expect(target()).toBe('b.md')
    expect(files()).toBe('b.md,a.md')
  })

  test('removing the open file opens the next one without the focus, removing the last one closes the viewer', async () => {
    const store = await storeWith('a.md', 'b.md', 'c.md')
    render(ui(store, 'course-1'))
    click('open-a.md')
    click('open-b.md')
    click('open-c.md')

    click('remove-a.md')
    expect(target()).toBe('c.md')
    expect(files()).toBe('c.md,b.md')

    click('remove-c.md')
    expect(target()).toBe('b.md')
    expect(state()).toBe('expanded no-focus')
    expect(readChatFiles('course-1')).toEqual(['b.md'])

    click('minimize')
    click('remove-b.md')
    expect(target()).toBe('')
    expect(files()).toBe('')
    expect(readChatFiles('course-1')).toEqual([])
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
    writeChatFiles('course-1', ['a.md'])
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
