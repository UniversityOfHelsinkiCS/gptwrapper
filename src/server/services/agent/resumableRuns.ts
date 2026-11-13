import { AIMessage, type BaseMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { MemorySaver } from '@langchain/langgraph'

/** How long a failed run can be continued. Its checkpoints are in memory, so keep this short. */
export const RESUME_TTL_MS = 30 * 60 * 1000

type FailedRun = { runId: string; checkpointer: MemorySaver; timer: NodeJS.Timeout }

/**
 * The latest failed run of each user, in this server process only. Retry continues it from the step that failed
 * instead of starting over. A restart, another server instance or the TTL loses it, and the retry then starts over.
 */
const failedRuns = new Map<string, FailedRun>()

/** Keeps a failed run for `RESUME_TTL_MS`, replacing the user's earlier one. */
export const keepFailedRun = (userId: string, runId: string, checkpointer: MemorySaver) => {
  dropFailedRun(userId)
  const timer = setTimeout(() => {
    if (failedRuns.get(userId)?.runId === runId) failedRuns.delete(userId)
  }, RESUME_TTL_MS)
  timer.unref()
  failedRuns.set(userId, { runId, checkpointer, timer })
}

/** The user's failed run with this id, removed from the store, or null when it is gone. */
export const takeFailedRun = (userId: string, runId: string): MemorySaver | null => {
  const run = failedRuns.get(userId)
  if (!run || run.runId !== runId) return null
  dropFailedRun(userId)
  return run.checkpointer
}

const dropFailedRun = (userId: string) => {
  const run = failedRuns.get(userId)
  if (!run) return
  clearTimeout(run.timer)
  failedRuns.delete(userId)
}

/** For tests. */
export const clearFailedRuns = () => {
  for (const userId of [...failedRuns.keys()]) dropFailedRun(userId)
}

export type ResumeState = {
  /** Main agent model calls made in this turn before it failed, for the model call budget. */
  modelCalls: number
  /** Finished tool calls of this turn by tool name, for the per-run call limits. */
  toolCalls: Map<string, number>
  /** Tool calls the model made that have no result yet: the resumed run runs them (again). */
  pendingCallIds: string[]
}

const isToolMessage = (value: unknown): value is ToolMessage => ToolMessage.isInstance(value)

/** The messages of the run's current turn (after the last user message), from its latest checkpoint. */
const readTurn = async (checkpointer: MemorySaver, threadId: string): Promise<BaseMessage[]> => {
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } })
  const messages = (tuple?.checkpoint.channel_values.messages ?? []) as BaseMessage[]
  // Results of tool calls that finished in the step that failed (parallel calls) are pending writes, not messages yet.
  const writtenResults = (tuple?.pendingWrites ?? []).flatMap(([, , value]) => (Array.isArray(value) ? value : [value])).filter(isToolMessage)

  const turnStart = messages.findLastIndex((message) => HumanMessage.isInstance(message))
  return [...messages.slice(turnStart + 1), ...writtenResults]
}

/**
 * The tool calls and results of the run's turn that the client has not had, as an agent `updates` chunk's data.
 *
 * When a run fails right after a step, its stream is errored before the last chunks are read, and those chunks are
 * lost: the client would show a finished tool or subagent as failed. The runner maps this update like a streamed
 * one and emits it before the error.
 */
export const readMissedCallUpdate = async (checkpointer: MemorySaver, threadId: string, started: ReadonlySet<string>, ended: ReadonlySet<string>) => {
  const turn = await readTurn(checkpointer, threadId)
  const calls = turn
    .filter((message): message is AIMessage => AIMessage.isInstance(message))
    .flatMap((message) => message.tool_calls ?? [])
    .filter((call) => call.id && !started.has(call.id))
  const results = turn.filter(isToolMessage).filter((message) => !ended.has(message.tool_call_id))
  if (calls.length === 0 && results.length === 0) return null
  return {
    model_request: { messages: calls.length > 0 ? [new AIMessage({ content: '', tool_calls: calls })] : [] },
    tools: { messages: results },
  }
}

/** What the failed run had done in its turn, read from its latest checkpoint. */
export const readResumeState = async (checkpointer: MemorySaver, threadId: string): Promise<ResumeState> => {
  const turn = await readTurn(checkpointer, threadId)

  const toolCalls = new Map<string, number>()
  const resultIds = new Set<string>()
  for (const message of turn.filter(isToolMessage)) {
    resultIds.add(message.tool_call_id)
    if (message.name) toolCalls.set(message.name, (toolCalls.get(message.name) ?? 0) + 1)
  }

  const aiMessages = turn.filter((message): message is AIMessage => AIMessage.isInstance(message))
  const lastCalls = aiMessages.at(-1)?.tool_calls ?? []
  const pendingCallIds = lastCalls.flatMap((call) => (call.id && !resultIds.has(call.id) ? [call.id] : []))

  return { modelCalls: aiMessages.length, toolCalls, pendingCallIds }
}
