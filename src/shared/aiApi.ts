export type WarningType = 'usage' | 'contextLimit'

export type AiApiStreamResponse = { stream: ReadableStream<Uint8Array> }

export type AiApiJsonResponse = {
  warningType: 'usage'
  warning: string
  canIgnore: boolean
} | {
  warningType: 'contextLimit'
  contextLimit: number
  tokenCount: number
  warning: string
  canIgnore: boolean
} | {
  error: string
}

export type AiApiResponse = AiApiJsonResponse | AiApiStreamResponse
