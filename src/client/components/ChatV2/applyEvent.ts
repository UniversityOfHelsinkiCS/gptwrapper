import type { AssistantPart, ChatEvent } from '../../../shared/agentChat'

/**
 * Pure reducer that builds an assistant message's `parts` from stream events.
 * Returns the same array when the event changes nothing, so React can skip re-renders.
 *
 * Errors, usage and processing events are not parts: errors end up in `AssistantMessage.error`,
 * usage is recorded on the server and processing only keeps the connection alive.
 */
export const applyEvent = (parts: AssistantPart[], event: ChatEvent): AssistantPart[] => {
  switch (event.type) {
    case 'text.delta': {
      // Text from a subagent (non-empty path) is nested into subagent parts in a later slice
      if (event.path.length > 0) return parts
      if (!event.text) return parts

      const last = parts.at(-1)
      if (last?.type === 'text') {
        return [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      }
      return [...parts, { type: 'text', text: event.text }]
    }

    default:
      return parts
  }
}
