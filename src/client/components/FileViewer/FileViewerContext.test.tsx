import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { FileViewerProvider, useFileViewer } from './FileViewerContext'
import { readOpenFile, writeOpenFile } from './viewerPersistence'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const Controls = () => {
  const viewer = useFileViewer()
  return (
    <>
      <output data-testid="target">{viewer?.target?.path ?? ''}</output>
      <button data-testid="open" onClick={() => viewer?.open({ path: 'b.md' })} />
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
})
