import { tool, type ToolRunnableConfig } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import { z } from 'zod/v4'
import { MockModel } from '../../langchain/MockModel'
import { mockSubagentSystemPrompt } from '../../langchain/mockContent'
import { runSubagent, summarizeSubagentPart } from './subagent'
import type { SubagentToolModule } from './types'

export const MOCK_SUBAGENT = 'mock_subagent'
export const MOCK_LOOKUP = 'mock_lookup'

/** The subagent's own tool. */
const mockLookup = tool(async ({ query }: { query: string }) => `The mock lookup found 42 facts about "${query}".`, {
  name: MOCK_LOOKUP,
  description: 'Looks up mock facts.',
  schema: z.object({ query: z.string() }),
})

/**
 * A subagent for tests and the mock model only, added automatically when chatting with the mock model and
 * called for the mock `subagent` prefix. Its agent answers with text and a `mock_lookup` call, then a summary;
 * for a task containing `fail` its model fails after the lookup.
 */
export const mockSubagent: SubagentToolModule = {
  name: MOCK_SUBAGENT,
  kind: 'subagent',
  executor: 'server',
  stage: 'experimental',

  create: () =>
    tool(
      async ({ task }: { task: string }, runtime: ToolRunnableConfig) =>
        runSubagent({
          agent: createAgent({ model: new MockModel({}), tools: [mockLookup], systemPrompt: mockSubagentSystemPrompt }),
          task,
          runtime,
        }),
      {
        name: MOCK_SUBAGENT,
        description: 'Delegates a task to a mock subagent.',
        schema: z.object({ task: z.string().describe('what the subagent should do') }),
      },
    ),

  summarizeForHistory: summarizeSubagentPart,
}
