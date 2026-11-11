import type { AssistantPart, ChatEvent, ReasoningPart, SubagentPart, ToolPart } from '../../../shared/agentChat'

/** Replaces the part of this type with this call id, or returns `parts` unchanged when there is none. */
const updatePart = <T extends ToolPart | SubagentPart>(
  parts: AssistantPart[],
  type: T['type'],
  callId: string,
  update: (part: T) => T | AssistantPart,
): AssistantPart[] => {
  const index = parts.findIndex((part) => part.type === type && part.callId === callId)
  if (index === -1) return parts
  const updated = update(parts[index] as T)
  return updated === parts[index] ? parts : parts.map((part, i) => (i === index ? updated : part))
}

const isOpenReasoning = (part: AssistantPart | undefined): part is ReasoningPart => part?.type === 'reasoning' && part.durationMs === undefined

/**
 * Ends the thinking of a still open reasoning part (the last one): its duration is known once the model moves
 * on to answering or calling a tool, or the stream ends. Returns `parts` unchanged when nothing is open.
 */
export const finishReasoning = (parts: AssistantPart[], now: number): AssistantPart[] => {
  const last = parts.at(-1)
  if (!isOpenReasoning(last)) return parts
  const { startedAt, ...rest } = last
  return [...parts.slice(0, -1), { ...rest, durationMs: Math.max(0, now - (startedAt ?? now)) }]
}

/**
 * Ends what was still running when a subagent or the whole run stopped: open reasoning gets its duration, and
 * running tools and subagents (and everything nested in them) take `status`. Returns `parts` unchanged when
 * nothing was running.
 */
const stopRunning = (parts: AssistantPart[], status: 'ok' | 'error', now: number): AssistantPart[] => {
  let changed = false
  const stopped = finishReasoning(parts, now).map((part): AssistantPart => {
    if (part.type === 'tool' && part.status === 'running') {
      changed = true
      const { progress: _progress, ...rest } = part
      return { ...rest, status }
    }
    if (part.type === 'subagent') {
      const nested = stopRunning(part.parts, status, now)
      if (nested === part.parts && part.status !== 'running') return part
      changed = true
      const { progress: _progress, ...rest } = part
      return { ...rest, parts: nested, status: part.status === 'running' ? status : part.status }
    }
    return part
  })
  return changed || stopped.at(-1) !== parts.at(-1) ? stopped : parts
}

/**
 * Finalizes the parts of a run that ended without finishing everything (stopped by the user, timed out, the
 * stream broke off, or old saved data): open reasoning gets its duration, and tools and subagents still
 * running, nested ones included, become `error`, so a saved answer never shows a spinner. The part status has
 * no separate "stopped" value; `error` is what the UI shows as not completed. Returns `parts` unchanged when
 * nothing was left open.
 */
export const finishParts = (parts: AssistantPart[], now: number): AssistantPart[] => stopRunning(parts, 'error', now)

/** Applies `update` to the parts at `path`: the top-level parts for `[]`, the parts of the subagent part with that call id chain otherwise. */
const updateAtPath = (parts: AssistantPart[], path: string[], update: (parts: AssistantPart[]) => AssistantPart[]): AssistantPart[] => {
  if (path.length === 0) return update(parts)
  const [callId, ...rest] = path
  return updatePart<SubagentPart>(parts, 'subagent', callId, (subagent) => {
    const nested = updateAtPath(subagent.parts, rest, update)
    return nested === subagent.parts ? subagent : { ...subagent, parts: nested }
  })
}

/** One event applied to the parts of the agent it belongs to (the parts at its path). */
const applyToParts = (parts: AssistantPart[], event: ChatEvent, now: number): AssistantPart[] => {
  switch (event.type) {
    case 'reasoning.delta': {
      if (!event.text) return parts

      const last = parts.at(-1)
      if (isOpenReasoning(last)) {
        return [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      }
      return [...parts, { type: 'reasoning', text: event.text, startedAt: now }]
    }

    case 'text.delta': {
      if (!event.text) return parts

      const last = parts.at(-1)
      if (last?.type === 'text') {
        return [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      }
      return [...finishReasoning(parts, now), { type: 'text', text: event.text }]
    }

    case 'tool.start': {
      if (parts.some((part) => part.type === 'tool' && part.callId === event.callId)) return parts
      return [...finishReasoning(parts, now), { type: 'tool', callId: event.callId, name: event.name, input: event.input, status: 'running' }]
    }

    case 'tool.progress': {
      // A subagent reports progress of its own tool call too (`read_pdf`: the pages it reads).
      const updated = updatePart<ToolPart>(parts, 'tool', event.callId, (part) => ({ ...part, progress: event.data }))
      return updated !== parts ? updated : updatePart<SubagentPart>(parts, 'subagent', event.callId, (part) => ({ ...part, progress: event.data }))
    }

    case 'tool.end':
      return updatePart<ToolPart>(parts, 'tool', event.callId, ({ progress: _progress, ...part }) => ({
        ...part,
        status: event.status,
        result: event.result,
        ...(event.artifact !== undefined ? { artifact: event.artifact } : {}),
      }))

    case 'subagent.start': {
      if (parts.some((part) => part.type === 'subagent' && part.callId === event.callId)) return parts
      return [...finishReasoning(parts, now), { type: 'subagent', callId: event.callId, name: event.name, task: event.task, parts: [], status: 'running' }]
    }

    case 'subagent.end':
      // Whatever the subagent left running stopped with it; it failed if the subagent did.
      return updatePart<SubagentPart>(parts, 'subagent', event.callId, ({ progress: _progress, ...part }) => ({
        ...part,
        parts: stopRunning(part.parts, event.status, now),
        status: event.status,
      }))

    default:
      return parts
  }
}

/**
 * Pure reducer that builds an assistant message's `parts` from stream events.
 * Returns the same array when the event changes nothing, so React can skip re-renders.
 *
 * Parts keep the order the events came in: text written before a tool call, the tool part, the text after it.
 * Several tool calls of one model turn are parts in call order, whatever order they finish in.
 * Reasoning deltas build a reasoning part, timed with `now` (the client clock) from its first delta until the
 * next text or tool part starts; a model that reasons again after a tool call gets a new reasoning part.
 *
 * A subagent is a part with parts of its own: events with a non-empty `path` go into the subagent part with
 * that call id chain, built by the same rules. Events for a subagent that has not started are dropped.
 *
 * Usage and processing events are not parts: usage is recorded on the server and processing only keeps the
 * connection alive. An error ends the run, so it also stops whatever was still running, as failed; the error
 * text itself ends up in `AssistantMessage.error`.
 */
export const applyEvent = (parts: AssistantPart[], event: ChatEvent, now: number = Date.now()): AssistantPart[] => {
  switch (event.type) {
    case 'usage':
    case 'processing':
      return parts
    case 'error':
      return stopRunning(parts, 'error', now)
    default:
      return 'path' in event ? updateAtPath(parts, event.path, (atPath) => applyToParts(atPath, event, now)) : parts
  }
}
