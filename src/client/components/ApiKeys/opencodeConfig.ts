import { FREE_MODEL, ModelProvider, validModels } from '@config'

export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY'

// Models from GET /api/external/v1/models, without Gemini (Vertex)
export const buildOpencodeConfig = (baseURL: string, apiKey: string) => ({
  $schema: 'https://opencode.ai/config.json',
  model: `currechat/${FREE_MODEL}`,
  provider: {
    currechat: {
      npm: '@ai-sdk/openai-compatible',
      name: 'CurreChat',
      options: { baseURL, apiKey },
      models: Object.fromEntries(
        validModels
          .filter((model) => model.name !== 'mock' && model.provider !== ModelProvider.Vertex)
          .map((model) => [model.name, { name: model.displayName, limit: { context: model.context, output: model.outputLimit } }]),
      ),
    },
  },
})

export const downloadOpencodeConfig = (baseURL: string, apiKey: string) => {
  const blob = new Blob([`${JSON.stringify(buildOpencodeConfig(baseURL, apiKey), null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'opencode.json'
  link.click()
  // Revoking synchronously can cancel the download in Safari and older Firefox
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
