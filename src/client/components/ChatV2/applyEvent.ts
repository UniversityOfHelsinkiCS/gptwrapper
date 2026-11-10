import type { AssistantPart, ChatEvent, ToolPart } from '../../../shared/agentChat'

/** Replaces the tool part with this call id, or returns `parts` unchanged when there is none. */
const updateToolPart = (parts: AssistantPart[], callId: string, update: (part: ToolPart) => ToolPart): AssistantPart[] => {
  const index = parts.findIndex((part) => part.type === 'tool' && part.callId === callId)
  if (index === -1) return parts
  return parts.map((part, i) => (i === index ? update(part as ToolPart) : part))
}

/**
 * Pure reducer that builds an assistant message's `parts` from stream events.
 * Returns the same array when the event changes nothing, so React can skip re-renders.
 *
 * Parts keep the order the events came in: text written before a tool call, the tool part, the text after it.
 * Several tool calls of one model turn are parts in call order, whatever order they finish in.
 *
 * Errors, usage and processing events are not parts: errors end up in `AssistantMessage.error`,
 * usage is recorded on the server and processing only keeps the connection alive.
 * Events of subagents (non-empty path) are nested into subagent parts in a later slice and ignored for now.
 */
export const applyEvent = (parts: AssistantPart[], event: ChatEvent): AssistantPart[] => {
  switch (event.type) {
    case 'text.delta': {
      if (event.path.length > 0) return parts
      if (!event.text) return parts

      const last = parts.at(-1)
      if (last?.type === 'text') {
        return [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      }
      return [...parts, { type: 'text', text: event.text }]
    }

    case 'tool.start': {
      if (event.path.length > 0) return parts
      if (parts.some((part) => part.type === 'tool' && part.callId === event.callId)) return parts
      return [...parts, { type: 'tool', callId: event.callId, name: event.name, input: event.input, status: 'running' }]
    }

    case 'tool.progress': {
      if (event.path.length > 0) return parts
      return updateToolPart(parts, event.callId, (part) => ({ ...part, progress: event.data }))
    }

    case 'tool.end': {
      if (event.path.length > 0) return parts
      return updateToolPart(parts, event.callId, ({ progress: _progress, ...part }) => ({
        ...part,
        status: event.status,
        result: event.result,
        ...(event.artifact !== undefined ? { artifact: event.artifact } : {}),
      }))
    }

    default:
      return parts
  }
}
