import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
vi.mock('../../util/featureEvents', () => ({ trackFeatureEvent: vi.fn() }))
import en from '../../locales/en.json'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { trackFeatureEvent } from '../../util/featureEvents'
import { AttachFolders, parseStoredFolders } from './AttachFolders'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  vi.mocked(trackFeatureEvent).mockClear()
})

const Harness = ({ store, initial = [] }: { store: MyFilesStore; initial?: string[] }) => {
  const [folders, setFolders] = useState(initial)
  return <AttachFolders store={store} attachedFolders={folders} onChange={setFolders} />
}

const renderAttach = (store: MyFilesStore, initial?: string[]) =>
  render(
    <I18nextProvider i18n={i18n}>
      <Harness store={store} initial={initial} />
    </I18nextProvider>,
  )

const storeWithFolders = async () => {
  const store = createMemoryStore()
  await store.write('Thesis/draft.md', 'x')
  await store.write('Course notes/a.md', 'x')
  await store.write('loose.md', 'x')
  await store.mkdir('Outputs')
  await store.mkdir('Agent notes')
  return store
}

describe('AttachFolders', () => {
  test('lists the own folders of My files and attaches one', async () => {
    renderAttach(await storeWithFolders())
    fireEvent.click(screen.getByRole('button', { name: 'Attach folders from My files' }))

    const options = await screen.findAllByRole('menuitemcheckbox')
    expect(options.map((option) => option.textContent)).toEqual(['Course notes', 'Thesis'])
    expect(options[0].getAttribute('aria-checked')).toBe('false')

    fireEvent.click(options[0])
    // The open menu hides the rest of the page from the accessibility tree
    expect(screen.getByRole('button', { name: 'Attached folder Course notes, press Delete to detach', hidden: true })).toBeTruthy()
    expect(screen.getAllByRole('menuitemcheckbox')[0].getAttribute('aria-checked')).toBe('true')
    expect(vi.mocked(trackFeatureEvent).mock.calls).toEqual([[{ feature: 'my_files', action: 'attach_folder' }]])
  })

  test('detaching from the menu sends no event', async () => {
    renderAttach(await storeWithFolders(), ['Thesis'])
    fireEvent.click(screen.getByRole('button', { name: 'Attach folders from My files' }))
    const options = await screen.findAllByRole('menuitemcheckbox')
    expect(options[1].getAttribute('aria-checked')).toBe('true')
    fireEvent.click(options[1])
    expect(screen.getAllByRole('menuitemcheckbox')[1].getAttribute('aria-checked')).toBe('false')
    expect(trackFeatureEvent).not.toHaveBeenCalled()
  })

  test('detaches a folder from its chip, also one no longer in My files', async () => {
    renderAttach(await storeWithFolders(), ['Removed', 'Thesis'])
    const chip = screen.getByRole('button', { name: 'Attached folder Removed, press Delete to detach' })
    fireEvent.keyUp(chip, { key: 'Delete' })
    expect(screen.queryByTestId('attached-folder')?.getAttribute('data-folder')).toBe('Thesis')
    expect(trackFeatureEvent).not.toHaveBeenCalled()
  })

  test('says when there are no folders to attach', async () => {
    renderAttach(createMemoryStore())
    fireEvent.click(screen.getByRole('button', { name: 'Attach folders from My files' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual(['Add folders in My files first.', 'Close'])
  })

  test('closes the menu from its Close item, as selecting folders keeps it open', async () => {
    renderAttach(await storeWithFolders())
    fireEvent.click(screen.getByRole('button', { name: 'Attach folders from My files' }))
    fireEvent.click(await screen.findByTestId('attach-folders-close'))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })
})

describe('parseStoredFolders', () => {
  test('keeps unique folder names from what was stored', () => {
    expect(parseStoredFolders(['A', 'A', 'b/c', '', 3, 'B'])).toEqual(['A', 'B'])
    expect(parseStoredFolders('A')).toEqual([])
    expect(parseStoredFolders(undefined)).toEqual([])
  })
})
