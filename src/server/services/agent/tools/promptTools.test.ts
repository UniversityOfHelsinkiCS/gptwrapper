// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod/v4'
import type { ToolModule } from './types'

vi.mock('../../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))
vi.mock('./documentSearch', () => ({ DOCUMENT_SEARCH: 'document_search' }))

const fakeModule = (overrides: Partial<ToolModule>): ToolModule =>
  ({ kind: 'tool', executor: 'server', stage: 'stable', create: vi.fn(), summarizeForHistory: vi.fn(), ...overrides }) as ToolModule

const modules = [
  fakeModule({
    name: 'flashcards',
    promptOption: { labelKey: 'prompt:a', descriptionKey: 'prompt:b' },
    configSchema: z.object({ count: z.number().int().min(1).max(10) }),
  }),
  fakeModule({ name: 'quiz', stage: 'experimental', promptOption: { labelKey: 'prompt:c', descriptionKey: 'prompt:d' } }),
  fakeModule({ name: 'document_search' }),
]

vi.mock('./registry', () => ({
  getToolModule: (name: string) => modules.find((module) => module.name === name),
  listToolModules: () => modules,
}))

import { copyablePromptTools, listAddableTools, promptEnabledTools, validatePromptTools } from './promptTools'

const teacher = { isAdmin: false }
const admin = { isAdmin: true }

const statusOf = (fn: () => unknown) => {
  try {
    fn()
    return 'ok'
  } catch (error) {
    return (error as { status?: number }).status
  }
}

describe('listAddableTools', () => {
  test('lists stable prompt tools to everyone and experimental ones to admins only', () => {
    expect(listAddableTools(teacher).map((t) => t.name)).toEqual(['flashcards'])
    expect(listAddableTools(admin).map((t) => t.name)).toEqual(['flashcards', 'quiz'])
  })
})

describe('validatePromptTools', () => {
  test("parses each tool's config with its configSchema", () => {
    expect(validatePromptTools(teacher, [{ name: 'flashcards', config: { count: 3 } }])).toEqual([{ name: 'flashcards', config: { count: 3 } }])
    expect(statusOf(() => validatePromptTools(teacher, [{ name: 'flashcards', config: { count: 30 } }]))).toBe(400)
    expect(statusOf(() => validatePromptTools(teacher, [{ name: 'flashcards' }]))).toBe(400)
  })

  test('rejects a config for a tool without a configSchema', () => {
    expect(statusOf(() => validatePromptTools(admin, [{ name: 'quiz', config: {} }]))).toBe(400)
  })

  test('experimental tools: 403 for a non-admin adding one, allowed when already on the prompt', () => {
    expect(statusOf(() => validatePromptTools(teacher, [{ name: 'quiz' }]))).toBe(403)
    expect(validatePromptTools(teacher, [{ name: 'quiz' }], [{ name: 'quiz' }])).toEqual([{ name: 'quiz' }])
    expect(validatePromptTools(admin, [{ name: 'quiz' }])).toEqual([{ name: 'quiz' }])
  })

  test('unknown tools and tools not turned on per prompt are 400', () => {
    expect(statusOf(() => validatePromptTools(admin, [{ name: 'nope' }]))).toBe(400)
    expect(statusOf(() => validatePromptTools(admin, [{ name: 'document_search' }]))).toBe(400)
  })
})

describe('copyablePromptTools', () => {
  test('keeps only the tools the user could add', () => {
    const tools = [{ name: 'flashcards', config: { count: 2 } }, { name: 'quiz' }, { name: 'gone' }]
    expect(copyablePromptTools(teacher, tools)).toEqual([{ name: 'flashcards', config: { count: 2 } }])
    expect(copyablePromptTools(admin, tools)).toEqual([{ name: 'flashcards', config: { count: 2 } }, { name: 'quiz' }])
  })
})

describe('promptEnabledTools', () => {
  test('document_search from the RAG index first, then the prompt tools, skipping ones no longer in the registry', () => {
    const ragIndex = { id: 7 } as any
    expect(promptEnabledTools({ ragIndex, tools: [{ name: 'quiz' }, { name: 'gone' }] })).toEqual([
      { name: 'document_search', config: { ragIndex } },
      { name: 'quiz' },
    ])
  })

  test('nothing for a prompt without tools or RAG index', () => {
    expect(promptEnabledTools({ tools: null, ragIndex: null })).toEqual([])
  })
})
