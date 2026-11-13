import { AIMessage, type BaseMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { MemorySaver } from '@langchain/langgraph'
import logger from '../../util/logger'
import { redisClient } from '../../util/redis'

/** How long a failed run can be continued. */
export const RESUME_TTL_MS = 30 * 60 * 1000
/** A failed run bigger than this (many large tool results) is not put in Redis; only this server can continue it. */
export const MAX_STORED_RUN_LENGTH = 5 * 1024 * 1024

/**
 * The latest failed run of each user, kept so that Retry continues it from the step that failed instead of starting
 * over. It is in Redis, so any server instance can continue it, and taken out when continued. Only the run's latest
 * checkpoint and its pending writes are stored: that is all continuing needs. When Redis cannot take it (down, or the
 * run is too big), it is kept in this server's memory instead, and a retry that reaches another server starts over.
 */
const redisKey = (userId: string) => `failed-agent-run:${userId}`

type StoredRun = {
  runId: string
  checkpointId: string
  /** The serialised checkpoint and metadata, base64. */
  checkpoint: string
  metadata: string
  /** Pending writes of the checkpoint by `MemorySaver`'s inner key: [taskId, channel, serialised value as base64]. */
  writes: Record<string, [string, string, string]>
}

type LocalRun = { runId: string; checkpointer: MemorySaver; timer: NodeJS.Timeout }

/** Failed runs that Redis could not take, in this server process only. */
const localRuns = new Map<string, LocalRun>()

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
const fromBase64 = (text: string) => new Uint8Array(Buffer.from(text, 'base64'))

/** `MemorySaver`'s key of the pending writes of a checkpoint in the root namespace. */
const writesKey = (threadId: string, checkpointId: string) => JSON.stringify([threadId, '', checkpointId])

/** The run's latest checkpoint in the root namespace, with its pending writes. */
export const snapshotRun = (checkpointer: MemorySaver, runId: string): StoredRun | null => {
  const checkpoints = checkpointer.storage[runId]?.['']
  const checkpointId = checkpoints ? Object.keys(checkpoints).sort((a, b) => b.localeCompare(a))[0] : undefined
  if (!checkpoints || !checkpointId) return null

  const [checkpoint, metadata] = checkpoints[checkpointId]
  const writes = checkpointer.writes[writesKey(runId, checkpointId)] ?? {}
  return {
    runId,
    checkpointId,
    checkpoint: toBase64(checkpoint),
    metadata: toBase64(metadata),
    writes: Object.fromEntries(Object.entries(writes).map(([key, [taskId, channel, value]]) => [key, [taskId, channel, toBase64(value)]])),
  }
}

/** A checkpointer with only the stored checkpoint, from which the run continues. */
export const restoreRun = (stored: StoredRun): MemorySaver => {
  const checkpointer = new MemorySaver()
  // No parent: a checkpoint holds all its channel values, and continuing never reads older ones.
  checkpointer.storage[stored.runId] = { '': { [stored.checkpointId]: [fromBase64(stored.checkpoint), fromBase64(stored.metadata), undefined] } }
  checkpointer.writes[writesKey(stored.runId, stored.checkpointId)] = Object.fromEntries(
    Object.entries(stored.writes).map(([key, [taskId, channel, value]]) => [key, [taskId, channel, fromBase64(value)]]),
  )
  return checkpointer
}

/** Keeps a failed run for `RESUME_TTL_MS`, replacing the user's earlier one. */
export const keepFailedRun = async (userId: string, runId: string, checkpointer: MemorySaver) => {
  dropLocalRun(userId)
  const stored = snapshotRun(checkpointer, runId)
  if (!stored) return

  const value = JSON.stringify(stored)
  if (value.length <= MAX_STORED_RUN_LENGTH && redisClient.isReady) {
    try {
      await redisClient.set(redisKey(userId), value, { PX: RESUME_TTL_MS })
      return
    } catch (error) {
      logger.warn('Failed to store a failed agent run in Redis, keeping it in this server', { error: error instanceof Error ? error.message : error })
    }
  } else {
    logger.info('Keeping a failed agent run in this server only', { length: value.length, redisReady: redisClient.isReady })
  }

  const timer = setTimeout(() => {
    if (localRuns.get(userId)?.runId === runId) localRuns.delete(userId)
  }, RESUME_TTL_MS)
  timer.unref()
  localRuns.set(userId, { runId, checkpointer, timer })
}

/** The user's failed run with this id, taken out so it is continued once, or null when it is gone. */
export const takeFailedRun = async (userId: string, runId: string): Promise<MemorySaver | null> => {
  const local = localRuns.get(userId)
  if (local?.runId === runId) {
    dropLocalRun(userId)
    return local.checkpointer
  }
  if (!redisClient.isReady) return null

  try {
    const value = await redisClient.get(redisKey(userId))
    if (typeof value !== 'string') return null
    const stored = JSON.parse(value) as StoredRun
    // An older id must not take the user's newer failed run.
    if (stored.runId !== runId) return null
    await redisClient.del(redisKey(userId))
    return restoreRun(stored)
  } catch (error) {
    logger.warn('Failed to read a failed agent run from Redis', { error: error instanceof Error ? error.message : error })
    return null
  }
}

const dropLocalRun = (userId: string) => {
  const run = localRuns.get(userId)
  if (!run) return
  clearTimeout(run.timer)
  localRuns.delete(userId)
}

/** For tests. */
export const clearLocalRuns = () => {
  for (const userId of [...localRuns.keys()]) dropLocalRun(userId)
}

export type ResumeState = {
  /** Main agent model calls made in this turn before it failed, for the model call budget. */
  modelCalls: number
  /** Finished tool calls of this turn by tool name, for the per-run call limits. */
  toolCalls: Map<string, number>
  /** Tool calls the model made that have no result yet: the resumed run runs them (again). */
  pendingCallIds: string[]
  /** Tool calls of this turn that the client already has, started and ended, so a resumed run does not send them again. */
  startedCallIds: string[]
  endedCallIds: string[]
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
  const startedCallIds = aiMessages.flatMap((message) => message.tool_calls ?? []).flatMap((call) => (call.id ? [call.id] : []))

  return { modelCalls: aiMessages.length, toolCalls, pendingCallIds, startedCallIds, endedCallIds: [...resultIds] }
}
