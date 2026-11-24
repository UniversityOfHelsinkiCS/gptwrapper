import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { FileViewerProvider, useFileViewer } from './FileViewerContext'
import { readMinimized, readOpenFile, writeMinimized, writeOpenFile } from './viewerPersistence'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const Controls = () => {
  const viewer = useFileViewer()
  return (
    <>
      <output data-testid="target">{viewer?.target?.path ?? ''}</output>
      <output data-testid="state">{viewer ? `${viewer.minimized ? 'minimized' : 'expanded'} ${viewer.restored ? 'restored' : 'opened'}` : ''}</output>
      <button data-testid="open" onClick={() => viewer?.open({ path: 'b.md' })} />
      <button data-testid="minimize" onClick={() => viewer?.minimize()} />
      <button data-testid="expand" onClick={() => viewer?.expand()} />
      <button data-testid="close" onClick={() => viewer?.close()} />
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
const state = () => screen.getByTestId('state').textContent

const storeWith = async (...paths: string[]) => {
  const store = createMemoryStore()
  for (const path of paths) await store.write(path, 'text')
  return store
}

describe('FileViewerProvider persistence', () => {
  test('remembers the open file per chat context and reopens it', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeOpenFile('course-1', 'a.md')
    const { rerender } = render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))

    // Another context starts with its own (here: no) file.
    rerender(ui(store, 'general'))
    expect(target()).toBe('')
    fireEvent.click(screen.getByTestId('open'))
    expect(target()).toBe('b.md')
    expect(readOpenFile('general')).toBe('b.md')
    expect(readOpenFile('course-1')).toBe('a.md')

    rerender(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    fireEvent.click(screen.getByTestId('close'))
    expect(target()).toBe('')
    expect(readOpenFile('course-1')).toBe(null)
  })

  test('a remembered file that is no longer in My files leaves the viewer closed', async () => {
    const store = await storeWith('other.md')
    writeOpenFile('course-1', 'gone.md')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(readOpenFile('course-1')).toBe(null))
    await act(async () => {})
    expect(target()).toBe('')
  })

  test('a folder at the remembered path is not opened', async () => {
    const store = await storeWith('folder/file.md')
    writeOpenFile('course-1', 'folder')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(readOpenFile('course-1')).toBe(null))
    expect(target()).toBe('')
  })

  test('nothing is reopened when the viewer is not available', async () => {
    const store = await storeWith('a.md')
    writeOpenFile('course-1', 'a.md')
    render(ui(store, 'course-1', false))
    await act(async () => {})
    expect(target()).toBe('')
    expect(readOpenFile('course-1')).toBe('a.md')
  })

  test('a restored file is marked restored, an opened one is not', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeOpenFile('course-1', 'a.md')
    render(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('a.md'))
    expect(state()).toBe('expanded restored')
    fireEvent.click(screen.getByTestId('open'))
    expect(state()).toBe('expanded opened')
  })
})

describe('FileViewerProvider minimize', () => {
  test('minimizes and expands the open file, remembered per chat context', async () => {
    const store = await storeWith('a.md', 'b.md')
    const { rerender } = render(ui(store, 'course-1'))
    fireEvent.click(screen.getByTestId('open'))
    fireEvent.click(screen.getByTestId('minimize'))
    expect(target()).toBe('b.md')
    expect(state()).toBe('minimized opened')
    expect(readMinimized('course-1')).toBe(true)

    rerender(ui(store, 'general'))
    expect(state()).toBe('expanded opened')
    expect(readMinimized('general')).toBe(false)

    rerender(ui(store, 'course-1'))
    await waitFor(() => expect(target()).toBe('b.md'))
    expect(state()).toBe('minimized restored')

    fireEvent.click(screen.getByTestId('expand'))
    expect(state()).toBe('expanded restored')
    expect(readMinimized('course-1')).toBe(false)
  })

  test('opening a file expands a minimized viewer', async () => {
    const store = await storeWith('a.md', 'b.md')
    writeOpenFile('course-1', 'a.md')
    writeMinimized('course-1', true)
    render(ui(store, 'course-1'))
    await waitFor(() => expect(state()).toBe('minimized restored'))
    fireEvent.click(screen.getByTestId('open'))
    expect(target()).toBe('b.md')
    expect(state()).toBe('expanded opened')
    expect(readMinimized('course-1')).toBe(false)
  })

  test('closing forgets the minimized state', async () => {
    const store = await storeWith('b.md')
    render(ui(store, 'course-1'))
    fireEvent.click(screen.getByTestId('open'))
    fireEvent.click(screen.getByTestId('minimize'))
    fireEvent.click(screen.getByTestId('close'))
    expect(target()).toBe('')
    expect(readMinimized('course-1')).toBe(false)
  })
})
