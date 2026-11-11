import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { AssistantPart, ToolPart } from '../../../../shared/agentChat'
import en from '../../../locales/en.json'
import { createMemoryStore } from '../../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../../util/myFiles/store'
import { MyFilesStoreProvider } from '../../MyFiles/MyFilesStoreContext'
import { OutputFiles, outputFilesOf } from './OutputFiles'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const write = (path: string, status: ToolPart['status'] = 'ok', name = 'write_file'): ToolPart => ({
  type: 'tool',
  callId: `call_${path}_${name}`,
  name,
  input: { path },
  status,
  result: status === 'ok' ? { tool: name, path, bytes: 3, created: true } : 'Error: refused',
})

const PARTS: AssistantPart[] = [
  write('Outputs/plan.md'),
  write('Agent notes/profile.md'),
  write('Outputs/refused.md', 'error'),
  { type: 'text', text: 'Here is your plan.' },
  write('Outputs/plan.md', 'ok', 'edit_file'),
  { type: 'subagent', callId: 'sub', name: 'mock_subagent', task: 't', status: 'ok', parts: [write('Outputs/from-subagent.md')] } as AssistantPart,
]

const renderList = (store: MyFilesStore, parts = PARTS) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <OutputFiles parts={parts} />
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )

describe('OutputFiles', () => {
  test('lists the Outputs files the answer wrote, once each', () => {
    expect(outputFilesOf(PARTS)).toEqual(['Outputs/plan.md', 'Outputs/from-subagent.md'])
  })

  test('renders nothing without output files', () => {
    const { container } = renderList(createMemoryStore(), [write('Agent notes/profile.md')])
    expect(container.innerHTML).toBe('')
  })

  test('downloads a file, and says when it is no longer in My files', async () => {
    const store = createMemoryStore()
    await store.write('Outputs/plan.md', 'abc')
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderList(store)

    expect(screen.getByRole('list', { name: 'Files from this answer (in My files, Outputs)' })).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download plan.md' }))
    })
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(await (createObjectURL.mock.calls[0][0] as Blob).text()).toBe('abc')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download from-subagent.md' }))
    })
    await waitFor(() => expect(screen.getByText('from-subagent.md is no longer in My files.')).toBeTruthy())
    expect(click).toHaveBeenCalledTimes(1)
  })
})
