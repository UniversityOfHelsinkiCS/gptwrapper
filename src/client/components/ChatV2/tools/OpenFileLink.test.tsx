import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import type { ReactNode } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
vi.mock('../../../util/featureEvents', () => ({ trackFeatureEvent: vi.fn() }))
import type { AssistantPart, SubagentPart, ToolPart } from '../../../../shared/agentChat'
import en from '../../../locales/en.json'
import { createMemoryStore } from '../../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../../util/myFiles/store'
import { FileViewerProvider, useFileViewer } from '../../FileViewer/FileViewerContext'
import { MyFilesStoreProvider } from '../../MyFiles/MyFilesStoreContext'
import { SubagentCard } from '../SubagentCard'
import { FileToolPart } from './FileToolPart'
import { readPdfFileOf, toolFileToOpen } from './OpenFileLink'
import { OutputFiles } from './OutputFiles'
import { trackFeatureEvent } from '../../../util/featureEvents'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.mocked(trackFeatureEvent).mockClear()
})

const readPdf = (path: string, pages?: string): ToolPart => ({
  type: 'tool',
  callId: `read_${path}`,
  name: 'read_file',
  input: pages ? { path, pages } : { path },
  status: 'ok',
  result: { tool: 'read_file', path, startPage: pages ? Number.parseInt(pages, 10) : 1, endPage: 5, totalPages: 9, excerpt: 'x' },
})

const readText = (path: string): ToolPart => ({
  type: 'tool',
  callId: `read_${path}`,
  name: 'read_file',
  input: { path },
  status: 'ok',
  result: { tool: 'read_file', path, startLine: 1, endLine: 3, totalLines: 3, excerpt: 'x' },
})

const write = (path: string, name = 'write_file', status: ToolPart['status'] = 'ok'): ToolPart => ({
  type: 'tool',
  callId: `${name}_${path}`,
  name,
  input: { path },
  status,
  result: status === 'ok' ? { tool: name, path, bytes: 3, created: true } : 'Error: refused',
})

const subagent = (overrides: Partial<SubagentPart>): SubagentPart => ({
  type: 'subagent',
  callId: 'sub',
  name: 'read_pdf',
  task: 'Find the exam date',
  parts: [],
  status: 'ok',
  ...overrides,
})

describe('toolFileToOpen', () => {
  test('read_file opens what it read, a PDF at the first page read', () => {
    expect(toolFileToOpen(readText('Course notes/lecture.md'))).toEqual({ path: 'Course notes/lecture.md' })
    expect(toolFileToOpen(readPdf('Course notes/book.pdf', '3-5'))).toEqual({ path: 'Course notes/book.pdf', page: 3 })
    expect(toolFileToOpen({ ...readPdf('Course notes/book.pdf'), result: undefined, input: { path: 'Course notes/book.pdf', pages: '7' } })).toEqual({
      path: 'Course notes/book.pdf',
      page: 7,
    })
  })

  test('write_file and edit_file open files in Outputs and Agent notes only', () => {
    expect(toolFileToOpen(write('Outputs/plan.md'))).toEqual({ path: 'Outputs/plan.md' })
    expect(toolFileToOpen(write('Agent notes/profile.md', 'edit_file'))).toEqual({ path: 'Agent notes/profile.md' })
    expect(toolFileToOpen(write('Course notes/x.md'))).toBeNull()
  })

  test('nothing for failed or running steps and other tools', () => {
    expect(toolFileToOpen(write('Outputs/plan.md', 'write_file', 'error'))).toBeNull()
    expect(toolFileToOpen({ ...readText('a/b.md'), status: 'running' })).toBeNull()
    expect(toolFileToOpen(write('Outputs/plan.md', 'delete_file'))).toBeNull()
    expect(toolFileToOpen({ type: 'tool', callId: 'ls', name: 'ls', input: { path: 'Course notes' }, status: 'ok', result: {} })).toBeNull()
  })
})

describe('readPdfFileOf', () => {
  test('is the PDF from the progress while it runs, or from the reader steps', () => {
    expect(readPdfFileOf(subagent({ status: 'running', progress: { action: 'read', path: 'Course notes/book.pdf' } }))).toEqual({
      path: 'Course notes/book.pdf',
    })
    expect(readPdfFileOf(subagent({ parts: [readPdf('Course notes/book.pdf', '2')] }))).toEqual({ path: 'Course notes/book.pdf' })
  })

  test('is nothing for other subagents or before the reader read anything', () => {
    expect(readPdfFileOf(subagent({ status: 'running' }))).toBeNull()
    expect(readPdfFileOf(subagent({ name: 'mock_subagent', parts: [readPdf('Course notes/book.pdf')] }))).toBeNull()
  })
})

const ViewerTarget = () => {
  const target = useFileViewer()?.target
  return <output data-testid="viewer-target">{target ? JSON.stringify(target) : ''}</output>
}

const renderWith = (store: MyFilesStore, children: ReactNode, available = true) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <FileViewerProvider available={available}>
          {children}
          <ViewerTarget />
        </FileViewerProvider>
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )

const storeWith = async (...paths: string[]) => {
  const store = createMemoryStore()
  for (const path of paths) await store.write(path, 'content')
  return store
}

const viewerTarget = () => JSON.parse(screen.getByTestId('viewer-target').textContent || 'null')

/** Waits until every stat the links made has settled, so that "no link" is final. */
const settled = async (stat: { mock: { results: { value: unknown }[] } }) => {
  await waitFor(() => expect(stat.mock.results.length).toBeGreaterThan(0))
  await Promise.all(stat.mock.results.map((result) => result.value))
}

describe('Open links on file tool steps', () => {
  test('read_file on a PDF opens it at the page read', async () => {
    const store = await storeWith('Course notes/book.pdf')
    renderWith(store, <FileToolPart part={readPdf('Course notes/book.pdf', '3-5')} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open book.pdf' }))
    expect(viewerTarget()).toEqual({ path: 'Course notes/book.pdf', page: 3 })
    expect(vi.mocked(trackFeatureEvent).mock.calls).toEqual([[{ feature: 'viewer', action: 'open', fileType: 'pdf', source: 'agent_link' }]])
  })

  test('write_file in Outputs opens the file', async () => {
    const store = await storeWith('Outputs/plan.md')
    renderWith(store, <FileToolPart part={write('Outputs/plan.md')} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open plan.md' }))
    expect(viewerTarget()).toEqual({ path: 'Outputs/plan.md' })
  })

  test('edit_file in Agent notes has a link', async () => {
    const store = await storeWith('Agent notes/profile.md')
    renderWith(store, <FileToolPart part={write('Agent notes/profile.md', 'edit_file')} />)
    expect(await screen.findByRole('button', { name: 'Open profile.md' })).toBeTruthy()
  })

  test('no link for a file no longer in My files', async () => {
    const store = await storeWith('Course notes/other.md')
    const stat = vi.spyOn(store, 'stat')
    renderWith(store, <FileToolPart part={readText('Course notes/lecture.md')} />)
    await settled(stat)
    expect(screen.queryByTestId('open-file-link')).toBeNull()
  })

  test('no link, and no stat, for a file the viewer cannot show', async () => {
    const store = await storeWith('Course notes/slides.pptx')
    const stat = vi.spyOn(store, 'stat')
    renderWith(store, <FileToolPart part={readText('Course notes/slides.pptx')} />)
    await Promise.resolve()
    expect(stat).not.toHaveBeenCalled()
    expect(screen.queryByTestId('open-file-link')).toBeNull()
  })

  test('no link without the viewer', async () => {
    const store = await storeWith('Outputs/plan.md')
    const stat = vi.spyOn(store, 'stat')
    renderWith(store, <FileToolPart part={write('Outputs/plan.md')} />, false)
    await Promise.resolve()
    expect(stat).not.toHaveBeenCalled()
    expect(screen.queryByTestId('open-file-link')).toBeNull()
  })

  test('no link for a write outside Outputs and Agent notes', async () => {
    const store = await storeWith('Course notes/x.md')
    const stat = vi.spyOn(store, 'stat')
    renderWith(store, <FileToolPart part={write('Course notes/x.md')} />)
    await Promise.resolve()
    expect(stat).not.toHaveBeenCalled()
    expect(screen.queryByTestId('open-file-link')).toBeNull()
  })

  test('the read_pdf card opens its PDF', async () => {
    const store = await storeWith('Course notes/book.pdf')
    renderWith(
      store,
      <SubagentCard part={subagent({ parts: [readPdf('Course notes/book.pdf', '2')] })}>
        <div />
      </SubagentCard>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Open book.pdf' }))
    expect(viewerTarget()).toEqual({ path: 'Course notes/book.pdf' })
  })
})

describe('Open on the output files list', () => {
  test('opens a viewable output, and offers no Open for other kinds', async () => {
    const store = await storeWith('Outputs/plan.md', 'Outputs/data.csv')
    const stat = vi.spyOn(store, 'stat')
    const parts: AssistantPart[] = [write('Outputs/plan.md'), write('Outputs/data.csv')]
    renderWith(store, <OutputFiles parts={parts} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open plan.md' }))
    expect(viewerTarget()).toEqual({ path: 'Outputs/plan.md' })
    expect(vi.mocked(trackFeatureEvent).mock.calls).toEqual([[{ feature: 'viewer', action: 'open', fileType: 'md', source: 'agent_link' }]])
    await settled(stat)
    expect(screen.getAllByTestId('output-file-open')).toHaveLength(1)
  })
})
