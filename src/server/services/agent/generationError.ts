const GENERATION_ERROR = 'Error while generating response'
const MAX_DETAIL_LENGTH = 500

/**
 * The error shown to the user when an agent run fails: the generic message followed by the error's own message, such
 * as a provider's rate limit or context length error, so the user knows what went wrong.
 */
export const describeGenerationError = (error: unknown): string => {
  const detail = (error instanceof Error ? error.message : typeof error === 'string' ? error : '').trim()
  if (!detail) return GENERATION_ERROR
  const shortened = detail.length > MAX_DETAIL_LENGTH ? `${detail.slice(0, MAX_DETAIL_LENGTH)}…` : detail
  return `${GENERATION_ERROR}: ${shortened}`
}
