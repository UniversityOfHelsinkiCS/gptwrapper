// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { getAzureChatOpenAI, getVertexModelProvider, toGeminiReasoning, toOpenAIReasoning } from './modelGenerators'

/**
 * The Gemini side is checked only against the request LangChain builds (Vertex cannot be called: the GCP project
 * has billing disabled). The Azure side is also covered by the real `azure-reasoning*` stream fixtures.
 */
describe('ModelConfig.reasoning per provider', () => {
  test('Azure (Responses API) gets the effort and asks for a reasoning summary only when it is shown', () => {
    expect(toOpenAIReasoning({ effort: 'medium', showSummary: true })).toEqual({ effort: 'medium', summary: 'auto' })
    expect(toOpenAIReasoning({ effort: 'high', showSummary: false })).toEqual({ effort: 'high' })

    // The Responses API request parameters (useResponsesApi is on)
    const reasoningParam = (model: ReturnType<typeof getAzureChatOpenAI>) => (model.invocationParams() as { reasoning?: unknown }).reasoning
    expect(reasoningParam(getAzureChatOpenAI('gpt-5-mini', true, { effort: 'low', showSummary: true }))).toEqual({ effort: 'low', summary: 'auto' })
    expect(reasoningParam(getAzureChatOpenAI('gpt-5-mini'))).toBeUndefined()
  })

  test('Gemini gets thinkingConfig with includeThoughts from the effort', async () => {
    expect(toGeminiReasoning({ effort: 'low', showSummary: true })).toEqual({ reasoningEffort: 'low' })

    const generationConfigOf = async (reasoning?: { effort: 'low' | 'medium' | 'high'; showSummary: boolean }) => {
      const model = getVertexModelProvider({ name: 'gemini-2.5-flash', modelRegion: 'europe-north1', reasoning })
      let body: { generationConfig?: Record<string, unknown> } = {}
      ;(model as unknown as { apiClient: unknown }).apiClient = {
        getProjectId: async () => 'test-project',
        hasApiKey: () => false,
        fetch: async (request: Request) => {
          body = await request.json()
          const reply = { candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] }, finishReason: 'STOP', index: 0 }] }
          return new Response(JSON.stringify(reply), { status: 200, headers: { 'content-type': 'application/json' } })
        },
      }
      await model.invoke('hi')
      return body.generationConfig ?? {}
    }

    expect((await generationConfigOf({ effort: 'low', showSummary: true })).thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingBudget: expect.any(Number),
    })
    expect((await generationConfigOf()).thinkingConfig).toBeUndefined()
  })
})
