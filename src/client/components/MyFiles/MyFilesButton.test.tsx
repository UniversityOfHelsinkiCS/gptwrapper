import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import en from '../../locales/en.json'
import type { User } from '../../types'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import MyFilesButton from './MyFilesButton'
import { MyFilesStoreProvider } from './MyFilesStoreContext'

let embedded = false
vi.mock('../../contexts/EmbeddedContext', () => ({ useIsEmbedded: () => embedded }))

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => {
  embedded = false
})
afterEach(cleanup)

const admin = { id: 'admin', isAdmin: true } as User
const student = { id: 'student', isAdmin: false } as User

const renderButton = (user: User, store: MyFilesStore = createMemoryStore()) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <MyFilesButton user={user} />
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )

const folderFile = (relativePath: string, content: string, lastModified: number) => {
  const file = new File([content], relativePath.split('/').at(-1) ?? relativePath, { lastModified })
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  return file
}

const pick = async (testId: string, files: File[]) => {
  const input = screen.getByTestId(testId) as HTMLInputElement
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  await act(async () => {
    fireEvent.change(input)
  })
}

const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'My files' }))
  return screen.findByRole('dialog')
}

describe('MyFilesButton', () => {
  test('is hidden from non-admins', () => {
    renderButton(student)
    expect(screen.queryByRole('button', { name: 'My files' })).toBeNull()
  })

  test('is hidden in embedded mode', () => {
    embedded = true
    renderButton(admin)
    expect(screen.queryByRole('button', { name: 'My files' })).toBeNull()
  })

  test('lists the reserved folders, adds a folder, skips unchanged files and marks changed ones as updated', async () => {
    const store = createMemoryStore()
    renderButton(admin, store)
    const dialog = await openDialog()

    await waitFor(() => expect(within(dialog).getByText('Outputs')).toBeTruthy())
    expect(within(dialog).getByText('Agent notes')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Sync folder Outputs' })).toBeNull()

    await pick('my-files-input-folder', [folderFile('Course/a.md', 'aaa', 1000), folderFile('Course/b.md', 'bbb', 1000)])
    await waitFor(() => expect(screen.getByTestId('my-files-status').textContent).toContain('New: 2, updated: 0, unchanged: 0.'))
    expect(await store.readText('Course/a.md')).toBe('aaa')

    await pick('my-files-input-folder', [folderFile('Course/a.md', 'aaa', 1000), folderFile('Course/b.md', 'bbbb', 2000)])
    await waitFor(() => expect(screen.getByTestId('my-files-status').textContent).toContain('New: 0, updated: 1, unchanged: 1.'))

    const toggle = within(dialog).getByRole('button', { name: /^Course/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const updatedRow = within(dialog).getByText('b.md').closest('tr')
    expect(updatedRow?.getAttribute('data-status')).toBe('updated')
    expect(within(dialog).getByText('a.md').closest('tr')?.getAttribute('data-status')).toBeNull()
  })

  test('refuses uploads into reserved folders', async () => {
    const store = createMemoryStore()
    renderButton(admin, store)
    await openDialog()
    await waitFor(() => expect(screen.getByText('Outputs')).toBeTruthy())

    await pick('my-files-input-folder', [folderFile('Outputs/x.md', 'x', 1000)])
    await waitFor(() => expect(screen.getByTestId('my-files-status').textContent).toContain('Not copied: 1'))
    expect(await store.stat('Outputs/x.md')).toBeNull()
  })

  test('clears everything after confirmation and recreates the reserved folders', async () => {
    const store = createMemoryStore()
    await store.write('Course/a.md', 'a')
    renderButton(admin, store)
    const dialog = await openDialog()
    await waitFor(() => expect(within(dialog).getByText('Course')).toBeTruthy())

    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear my files' }))
    const confirm = await screen.findByRole('dialog', { name: 'Clear my files?' })
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'Clear my files' }))
    })

    await waitFor(() => expect(screen.queryByText('Course')).toBeNull())
    expect((await store.list()).map((entry) => entry.path)).toEqual(['Agent notes', 'Outputs'])
  })
})
