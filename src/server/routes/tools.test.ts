// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

// The tool registry imports the RAG search, which needs the vector DB.
vi.mock('../services/rag/search', () => ({ search: vi.fn() }))
vi.mock('../services/langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))
vi.mock('../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import toolsRouter from './tools'

let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/tools', toolsRouter, () => currentUser)

beforeEach(() => {
  currentUser = { id: 'teacher-1', isAdmin: false }
})

const listTools = async () => {
  const response = await api.fetch('/tools')
  expect(response.status).toBe(200)
  return (await response.json()) as { name: string }[]
}

describe('GET /tools', () => {
  test('lists experimental tools to admins, with the translation keys of their checkbox', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }

    expect(await listTools()).toEqual([
      { name: 'present_quiz', stage: 'experimental', labelKey: 'prompt:toolPresentQuizLabel', descriptionKey: 'prompt:toolPresentQuizDescription' },
    ])
  })

  test('does not list experimental tools to others', async () => {
    expect((await listTools()).map((tool) => tool.name)).not.toContain('present_quiz')
  })

  test('never lists mock-only tools or document_search, which comes from the RAG index', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }

    const names = (await listTools()).map((tool) => tool.name)

    expect(names).not.toContain('mock_subagent')
    expect(names).not.toContain('document_search')
  })
})
