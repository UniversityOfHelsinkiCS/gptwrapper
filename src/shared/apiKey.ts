/**
 * Personal OpenAI-compatible API keys. Keys never expire; deleting a key disables it.
 *
 * Endpoints (relative to /api, see src/server/routes/apiKey.ts):
 *   GET    /apikeys       -> ApiKey[] (newest first)
 *   POST   /apikeys       -> ApiKey, 409 when the user already has the maximum number of keys
 *   DELETE /apikeys/:id   -> 204
 */
/** Must match the limit in src/server/routes/apiKey.ts */
export const MAX_API_KEYS = 10

export type ApiKey = {
  id: string
  apiKey: string
  createdAt: string
}