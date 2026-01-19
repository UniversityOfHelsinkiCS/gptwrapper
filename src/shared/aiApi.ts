import { z } from "zod/v4"

export const WarningTypes = z.enum(['usage', 'contextLimit', 'fileParsingError'])

export type WarningType = z.infer<typeof WarningTypes>

export type AiApiStreamResponse = { stream: ReadableStream<Uint8Array> }

export type AiApiWarning = {
  warningType: 'usage'
  warning: string
  canIgnore: boolean
} | {
  warningType: 'contextLimit'
  contextLimit: number
  tokenCount: number
  warning: string
  canIgnore: boolean
}

export type AiApiJsonResponse = {
  warnings: AiApiWarning[]
} | {
  error: string
}

export type AiApiResponse = AiApiJsonResponse | AiApiStreamResponse
