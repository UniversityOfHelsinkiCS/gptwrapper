import type { ValidModelName } from '@config'
import { mergeUsage, type ModelUsage, type TokenUsage } from '@shared/usage'
import { subagentModelOf } from './tools/registry'

/**
 * Collects one run's usage by model: the main agent's model calls under the chat model, each subagent's under the
 * model its tool runs on. Recorded with `recordModelUsage` when the run is charged.
 */
export const createRunUsage = (chatModel: ValidModelName) => {
  let usage: ModelUsage = {}
  const add = (model: string, tokens: TokenUsage) => {
    usage = mergeUsage(usage, { [model]: tokens })
  }
  return {
    addMainCall: (tokens: TokenUsage) => add(chatModel, tokens),
    /** `toolName` is the subagent tool the call ran in, when known. */
    addSubagentCall: (toolName: string | undefined, tokens: TokenUsage) => add(subagentModelOf(toolName, chatModel), tokens),
    get usage(): ModelUsage {
      return usage
    },
  }
}
