import { isGraphInterrupt } from '@langchain/langgraph'
import { createMiddleware, ToolMessage } from 'langchain'
import logger from '../../util/logger'
import { ToolError } from './tools/types'

/**
 * Turns a failing tool into an error `ToolMessage` (status `error`, so the client shows the call as failed)
 * that the model can react to. Without this the agent's default handler hides the failure in a normal result.
 */
export const toolErrorMiddleware = (signal: AbortSignal) =>
  createMiddleware({
    name: 'ToolErrors',
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request)
      } catch (error) {
        if (signal.aborted || isGraphInterrupt(error)) throw error
        if (error instanceof ToolError) {
          // An expected failure (a refused path, a missing file, no answer from the browser) that the model can act on.
          logger.info('Tool call failed', { tool: request.toolCall.name, error: error.message })
          return new ToolMessage({
            content: `Error: ${error.message}`,
            tool_call_id: request.toolCall.id ?? '',
            name: request.toolCall.name,
            status: 'error',
          })
        }
        logger.error('Tool call failed', {
          tool: request.toolCall.name,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        })
        return new ToolMessage({
          content: 'The tool failed. Tell the user it did not work, and answer without it if you can.',
          tool_call_id: request.toolCall.id ?? '',
          name: request.toolCall.name,
          status: 'error',
        })
      }
    },
  })

/** The message the model reads for a call over a tool's per-run limit. */
export const callLimitMessage = (name: string, limit: number) =>
  `Error: ${name} can be used at most ${limit} ${limit === 1 ? 'time' : 'times'} per answer, and that limit is reached. Answer with what you have, and tell the user if something is missing.`

/**
 * Caps the calls of tools per run (one middleware per run): `limits` maps a tool name to the most calls it may
 * have. Further calls are not run; they end as an error `ToolMessage` the model reads. Calls are counted when they
 * start, so parallel calls in one model turn are counted too.
 */
export const callLimitMiddleware = (limits: ReadonlyMap<string, number>) => {
  const counts = new Map<string, number>()
  return createMiddleware({
    name: 'ToolCallLimits',
    wrapToolCall: async (request, handler) => {
      const name = request.toolCall.name
      const limit = limits.get(name)
      if (limit === undefined) return handler(request)

      const count = (counts.get(name) ?? 0) + 1
      counts.set(name, count)
      if (count <= limit) return handler(request)

      logger.info('Tool call over its per-run limit', { tool: name, limit })
      return new ToolMessage({ content: callLimitMessage(name, limit), tool_call_id: request.toolCall.id ?? '', name, status: 'error' })
    },
  })
}
