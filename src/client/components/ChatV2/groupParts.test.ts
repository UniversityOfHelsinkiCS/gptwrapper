import { describe, expect, test } from 'vitest'
import type { AssistantPart } from '../../../shared/agentChat'
import { groupParts, isPartFailed, isPartRunning } from './groupParts'

const text = (value: string): AssistantPart => ({ type: 'text', text: value })
const tool = (callId: string, name = 'ls', status: 'running' | 'ok' | 'error' = 'ok'): AssistantPart => ({ type: 'tool', callId, name, input: {}, status })
const reasoning = (durationMs?: number): AssistantPart => ({ type: 'reasoning', text: 'hmm', durationMs })
const subagent = (status: 'running' | 'ok' | 'error' = 'ok'): AssistantPart => ({
  type: 'subagent',
  callId: 'sub',
  name: 'read_pdf',
  task: 't',
  parts: [],
  status,
})

const isActivity = (part: AssistantPart) => part.type !== 'text' && !(part.type === 'tool' && part.name === 'present_quiz')

describe('groupParts', () => {
  test('groups consecutive activity parts between texts', () => {
    const parts = [text('a'), tool('1'), reasoning(10), subagent(), text('b')]
    expect(groupParts(parts, isActivity)).toEqual([
      { type: 'part', part: parts[0], index: 0 },
      { type: 'activity', parts: [parts[1], parts[2], parts[3]], index: 1 },
      { type: 'part', part: parts[4], index: 4 },
    ])
  })

  test('a single activity part is not grouped', () => {
    const parts = [tool('1'), text('a')]
    expect(groupParts(parts, isActivity)).toEqual([
      { type: 'part', part: parts[0], index: 0 },
      { type: 'part', part: parts[1], index: 1 },
    ])
  })

  test('a content tool ends a run and is not grouped', () => {
    const parts = [tool('1'), tool('2'), tool('q', 'present_quiz'), tool('3'), tool('4')]
    expect(groupParts(parts, isActivity)).toEqual([
      { type: 'activity', parts: [parts[0], parts[1]], index: 0 },
      { type: 'part', part: parts[2], index: 2 },
      { type: 'activity', parts: [parts[3], parts[4]], index: 3 },
    ])
  })

  test('a trailing run is grouped', () => {
    const parts = [text('a'), tool('1'), tool('2')]
    expect(groupParts(parts, isActivity)).toEqual([
      { type: 'part', part: parts[0], index: 0 },
      { type: 'activity', parts: [parts[1], parts[2]], index: 1 },
    ])
  })

  test('no parts gives no items', () => {
    expect(groupParts([], isActivity)).toEqual([])
  })
})

describe('part status', () => {
  test('running', () => {
    expect(isPartRunning(tool('1', 'ls', 'running'))).toBe(true)
    expect(isPartRunning(subagent('running'))).toBe(true)
    expect(isPartRunning(reasoning())).toBe(true)
    expect(isPartRunning(reasoning(5))).toBe(false)
    expect(isPartRunning(tool('1'))).toBe(false)
    expect(isPartRunning(text('a'))).toBe(false)
  })

  test('failed', () => {
    expect(isPartFailed(tool('1', 'ls', 'error'))).toBe(true)
    expect(isPartFailed(subagent('error'))).toBe(true)
    expect(isPartFailed(tool('1'))).toBe(false)
    expect(isPartFailed(reasoning(5))).toBe(false)
  })
})
