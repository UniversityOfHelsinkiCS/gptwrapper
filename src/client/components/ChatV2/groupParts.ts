import type { AssistantPart } from '../../../shared/agentChat'

/** One part in its place in the answer. `index` is its position in the message's parts. */
export type SinglePartItem = { type: 'part'; part: AssistantPart; index: number }

/** Two or more consecutive activity parts shown together. `index` is the position of the first one. */
export type ActivityGroupItem = { type: 'activity'; parts: AssistantPart[]; index: number }

export type PartItem = SinglePartItem | ActivityGroupItem

/**
 * Groups each run of consecutive activity parts (tool calls, subagents, reasoning) between content parts
 * (text, a quiz) so the answer is not cluttered by them. A run of one part is not grouped.
 */
export const groupParts = (parts: AssistantPart[], isActivity: (part: AssistantPart) => boolean): PartItem[] => {
  const items: PartItem[] = []
  let run: AssistantPart[] = []
  let runStart = 0

  const flush = () => {
    if (run.length === 1) {
      items.push({ type: 'part', part: run[0], index: runStart })
    } else if (run.length > 1) {
      items.push({ type: 'activity', parts: run, index: runStart })
    }
    run = []
  }

  parts.forEach((part, index) => {
    if (isActivity(part)) {
      if (run.length === 0) runStart = index
      run.push(part)
    } else {
      flush()
      items.push({ type: 'part', part, index })
    }
  })
  flush()

  return items
}

/** Whether the part is still in progress: a running tool or subagent, or reasoning that has not ended. */
export const isPartRunning = (part: AssistantPart) =>
  part.type === 'reasoning' ? part.durationMs === undefined : part.type === 'tool' || part.type === 'subagent' ? part.status === 'running' : false

export const isPartFailed = (part: AssistantPart) => (part.type === 'tool' || part.type === 'subagent') && part.status === 'error'
