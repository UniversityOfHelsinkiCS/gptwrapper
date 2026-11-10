/**
 * Captures raw `agent.stream` tuples ([namespace, mode, data]) from real provider runs and saves them as
 * JSON fixtures for the `mapStreamChunk` unit tests.
 *
 * Usage (from the repo root, needs AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID in .env and
 * gcloud application default credentials for Vertex):
 *
 *   npx tsx --env-file=.env scripts/captureAgentStreamFixtures.ts [azure|vertex|vertex-replay|all] [scenario]
 *
 * `vertex-replay` is the fallback for when Vertex cannot be called (in Nov 2026 the GCP project had billing
 * disabled by the budget kill switch, so every call failed with 403). It runs the real `ChatGoogle` model and
 * agent, but swaps the HTTP client for one that answers with a hand-written Gemini `streamGenerateContent`
 * SSE body (see `geminiReplies` below). The LangChain conversion (content arrays, thought signatures, usage
 * deltas) is real; the Gemini API response is not. Those fixtures are marked `"synthetic": true`.
 *
 * Fixtures are written to src/server/services/agent/fixtures/. The tuples are serialised with
 * `JSON.stringify`, so LangChain message objects become their `toJSON()` (lc serialised) form; the tests
 * revive them with `load` from `@langchain/core/load` so `mapStreamChunk` sees the same classes as in a run.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { tool } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import { z } from 'zod/v4'
import type { ModelReasoning } from '../src/config'
import { getAzureChatOpenAI, getVertexModelProvider } from '../src/server/services/langchain/modelGenerators'

const FIXTURE_DIR = path.join(import.meta.dirname, '../src/server/services/agent/fixtures')

const AZURE_MODEL = process.env.CAPTURE_AZURE_MODEL ?? 'gpt-5-mini'
const VERTEX_MODEL = process.env.CAPTURE_VERTEX_MODEL ?? 'gemini-2.5-flash'
const VERTEX_REGION = process.env.CAPTURE_VERTEX_REGION ?? 'europe-north1'

/** Same shape as the RAG search tool: content_and_artifact, so the agent makes a second model call. */
const searchTool = tool(
  async ({ query }: { query: string }) => [`Course material about "${query}": the exam is on 12 December in hall A.`, [{ id: 'doc-1' }]],
  {
    name: 'document_search',
    description: 'Search the course materials. Always use this before answering questions about the course.',
    schema: z.object({ query: z.string().describe('the query to search for') }),
    responseFormat: 'content_and_artifact',
  },
)

type GeminiChunk = Record<string, unknown>

const usage = (prompt: number, candidates: number, thoughts = 0) => ({
  usageMetadata: { promptTokenCount: prompt, candidatesTokenCount: candidates, thoughtsTokenCount: thoughts, totalTokenCount: prompt + candidates + thoughts },
})
const candidate = (parts: unknown[], finishReason?: string) => ({
  candidates: [{ content: { role: 'model', parts }, index: 0, ...(finishReason ? { finishReason } : {}) }],
  modelVersion: 'gemini-2.5-flash',
})

/** Hand-written Gemini API replies in the documented streamGenerateContent shape, keyed by the request kind. */
const geminiReplies: Record<'text' | 'toolCall' | 'afterTool', GeminiChunk[]> = {
  text: [
    // A thought part next to a text part makes ChatGoogle emit `content` as an array of blocks.
    {
      ...candidate([
        { text: 'The user wants a short greeting.', thought: true },
        { text: 'Hello there!', thoughtSignature: 'CiQB0e2Kb1synthetic' },
      ]),
      ...usage(12, 3, 40),
    },
    { ...candidate([{ text: ' Nice to meet you.' }]), ...usage(12, 8, 40) },
    { ...candidate([{ text: '' }], 'STOP'), ...usage(12, 8, 40) },
  ],
  toolCall: [
    {
      ...candidate([{ functionCall: { name: 'document_search', args: { query: 'exam date' } }, thoughtSignature: 'CiQB0e2Kb2synthetic' }], 'STOP'),
      ...usage(70, 18, 55),
    },
  ],
  afterTool: [
    // Two text parts in one chunk: also an array.
    { ...candidate([{ text: 'The exam is on ' }, { text: '12 December', thoughtSignature: 'CiQB0e2Kb3synthetic' }]), ...usage(110, 6) },
    { ...candidate([{ text: ' in hall A.' }]), ...usage(110, 11) },
    { ...candidate([{ text: '' }], 'STOP'), ...usage(110, 11) },
  ],
}

const replayApiClient = {
  getProjectId: async () => 'replay-project',
  hasApiKey: () => false,
  fetch: async (request: Request) => {
    const body = (await request.json()) as { contents: { parts: Record<string, unknown>[] }[]; tools?: unknown[] }
    const hasToolResult = body.contents.some((c) => c.parts.some((p) => 'functionResponse' in p))
    const reply = hasToolResult ? geminiReplies.afterTool : body.tools?.length ? geminiReplies.toolCall : geminiReplies.text
    const sse = reply.map((chunk) => `data: ${JSON.stringify(chunk)}\r\n\r\n`).join('')
    return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } })
  },
}

type Scenario = { name: string; withTools: boolean; prompt: string; reasoning?: ModelReasoning }

const scenarios: Scenario[] = [
  { name: 'text', withTools: false, prompt: 'Say hello in two short sentences.' },
  { name: 'tool', withTools: true, prompt: 'When is the exam? Search the course materials first, then answer in one sentence.' },
  // With ModelConfig.reasoning, so the model streams its reasoning summary (Azure) or thoughts (Gemini).
  {
    name: 'reasoning',
    withTools: false,
    prompt: 'A bat and a ball cost 1.10 euros in total. The bat costs 1.00 euro more than the ball. How much does the ball cost? Answer in one sentence.',
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'reasoning-tool',
    withTools: true,
    prompt: 'When is the exam, and how many days after 1 December is it? Search the course materials first, then answer in one sentence.',
    reasoning: { effort: 'medium', showSummary: true },
  },
]

type Provider = 'azure' | 'vertex' | 'vertex-replay'

const getModel = (provider: Provider, reasoning?: ModelReasoning) => {
  if (provider === 'azure') return getAzureChatOpenAI(AZURE_MODEL, true, reasoning)
  const model = getVertexModelProvider({ name: VERTEX_MODEL, modelRegion: VERTEX_REGION, reasoning })
  if (provider === 'vertex-replay') {
    ;(model as unknown as { apiClient: typeof replayApiClient }).apiClient = replayApiClient
  }
  return model
}

const capture = async (provider: Provider, scenario: Scenario) => {
  const model = getModel(provider, scenario.reasoning)
  const agent = createAgent({ model, tools: scenario.withTools ? [searchTool] : [] })

  const stream = await agent.stream(
    {
      messages: [
        { role: 'system', content: 'You are a helpful course assistant.' },
        { role: 'user', content: scenario.prompt },
      ],
    },
    { streamMode: ['messages', 'updates', 'custom'], subgraphs: true, recursionLimit: 25 },
  )

  const tuples: unknown[] = []
  for await (const chunk of stream) {
    tuples.push(chunk)
  }

  const file = path.join(FIXTURE_DIR, `${provider}-${scenario.name}.json`)
  await writeFile(
    file,
    `${JSON.stringify({ provider, synthetic: provider === 'vertex-replay', model: provider === 'azure' ? AZURE_MODEL : VERTEX_MODEL, capturedAt: new Date().toISOString(), prompt: scenario.prompt, tuples }, null, 2)}\n`,
  )
  console.log(`Wrote ${tuples.length} tuples to ${file}`)
}

const main = async () => {
  const which = process.argv[2] ?? 'all'
  const onlyScenario = process.argv[3]
  await mkdir(FIXTURE_DIR, { recursive: true })
  const providers: Provider[] = which === 'all' ? ['azure', 'vertex'] : [which as Provider]

  for (const provider of providers) {
    for (const scenario of scenarios.filter((s) => !onlyScenario || s.name === onlyScenario)) {
      try {
        await capture(provider, scenario)
      } catch (error) {
        console.error(`Capture failed for ${provider}/${scenario.name}:`, error)
        process.exitCode = 1
      }
    }
  }
}

void main()
