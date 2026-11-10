import type { BaseMessage } from '@langchain/core/messages'
import type { AssistantPart, SubagentPart } from '@shared/agentChat'
import type { SubagentRunPayload, ToolRuntime } from './types'

/** The part of a `createAgent` agent that `runSubagent` uses. */
type SubagentAgent = {
  invoke: (input: { messages: { role: 'user'; content: string }[] }, config?: ToolRuntime) => Promise<{ messages: BaseMessage[] }>
}

/**
 * Runs a subagent's own agent from inside its tool function and returns its final answer, which becomes the
 * tool result the calling agent reads.
 *
 * The agent runs with the tool's `runtime` config, so its chunks are streamed in the main `agent.stream` under
 * the tool's `tools:<task>` namespace segment. Before that, it writes a `subagent.run` payload that tells the
 * stream mapping which call id that segment stands for, so the subagent's events carry the right path from
 * its first chunk on.
 */
export const runSubagent = async ({ agent, task, runtime }: { agent: SubagentAgent; task: string; runtime: ToolRuntime }): Promise<string> => {
  const callId = runtime.toolCall?.id
  const checkpointNamespace = runtime.configurable?.checkpoint_ns
  const namespaceSegment = typeof checkpointNamespace === 'string' ? checkpointNamespace.split('|').at(-1) : undefined
  if (callId && namespaceSegment && runtime.writer) {
    runtime.writer({ type: 'subagent.run', callId, namespaceSegment } satisfies SubagentRunPayload)
  }

  const result = await agent.invoke({ messages: [{ role: 'user', content: task }] }, runtime)
  return result.messages.at(-1)?.text ?? ''
}

/** Length of the excerpt of a subagent's answer kept in the history sent to the model. */
const ANSWER_EXCERPT_LENGTH = 500

const lastText = (parts: AssistantPart[]): string => parts.findLast((part) => part.type === 'text')?.text ?? ''

const excerpt = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > ANSWER_EXCERPT_LENGTH ? `${flat.slice(0, ANSWER_EXCERPT_LENGTH)}…` : flat
}

/** A subagent part of an earlier answer as text for the model: what it was asked, and an excerpt of its answer. */
export const summarizeSubagentPart = (part: SubagentPart): string => {
  const asked = `[Asked the subagent ${part.name}: "${part.task}"`
  if (part.status === 'error') return `${asked}, but it failed.]`
  if (part.status === 'running') return `${asked}, but it was interrupted.]`
  const answer = excerpt(lastText(part.parts))
  return answer.length > 0 ? `${asked}. It answered (excerpt): "${answer}"]` : `${asked}. It gave no answer.]`
}
