import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../config', async () => ({ ValidModelNameSchema: (await import('zod/v4')).z.string() }))

import { act, renderHook } from '@testing-library/react'
import { readMessageContent } from '../../../shared/chat'
import type { AssistantMessageV2, AssistantPart } from '../../../shared/agentChat'
import { oldFormatMessages, oldFormatMessageWithToolCalls } from './__fixtures__/oldFormatMessages'
import {
  MESSAGES_VERSION,
  type ClientChatMessage,
  messageToolResults,
  messageToText,
  migrateMessages,
  parseStoredMessages,
  serializeMessages,
  toHistoryMessages,
} from './messages'
import { useChatMessages } from './useChatMessages'

const oldStored = JSON.stringify({ value: oldFormatMessages })

describe('migrating saved conversations', () => {
  test('old assistant messages get their content as a single text part', () => {
    const messages = parseStoredMessages(oldStored)

    expect(messages).toHaveLength(8)
    expect(messages[1]).toEqual({
      role: 'assistant',
      parts: [{ type: 'text', text: oldFormatMessages[1].content }],
      generationInfo: oldFormatMessages[1].generationInfo,
    })
  })

  test('user messages are kept as they are', () => {
    const messages = parseStoredMessages(oldStored)
    expect(messages[0]).toEqual(oldFormatMessages[0])
    expect(messages[2]).toEqual(oldFormatMessages[2])
    expect(messages[4]).toEqual(oldFormatMessages[4])
  })

  test('an empty errored answer keeps its error and gets no parts', () => {
    const messages = parseStoredMessages(oldStored)
    expect(messages[5]).toEqual({ role: 'assistant', parts: [], error: 'timeout_error', generationInfo: oldFormatMessages[5].generationInfo })
  })

  test('toolCalls (RAG sources) become tool parts before the text', () => {
    const migrated = parseStoredMessages(oldStored)[7]
    const { call_1, call_2 } = oldFormatMessageWithToolCalls.toolCalls
    expect(migrated).toEqual({
      role: 'assistant',
      parts: [
        { type: 'tool', callId: 'call_1', name: 'document_search', input: call_1.input, status: 'ok', result: call_1.result },
        { type: 'tool', callId: 'call_2', name: 'document_search', input: call_2.input, status: 'ok', result: call_2.result },
        { type: 'text', text: 'Found it in the lecture notes.' },
      ],
      generationInfo: oldFormatMessageWithToolCalls.generationInfo,
    })
  })

  test('messageToolResults gives back the old tool call results for the Sources panel', () => {
    const migrated = parseStoredMessages(oldStored)[7]
    if (migrated.role !== 'assistant') throw new Error('expected an assistant message')
    expect(messageToolResults(migrated)).toEqual(
      Object.values(oldFormatMessageWithToolCalls.toolCalls).map(({ text: _text, ...toolCall }) => ({ ...toolCall, text: '' })),
    )
  })

  test('tool parts without a file list are not sources', () => {
    expect(
      messageToolResults({
        role: 'assistant',
        parts: [{ type: 'tool', callId: 'q', name: 'present_quiz', input: {}, status: 'ok', result: { questions: [] } }],
      }),
    ).toEqual([])
  })

  test('migration is idempotent', () => {
    const once = migrateMessages(JSON.parse(oldStored).value)
    expect(migrateMessages(once)).toEqual(once)
  })

  test('version 2 data is read as is', () => {
    const messages: ClientChatMessage[] = [{ role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }]
    expect(parseStoredMessages(serializeMessages(messages))).toEqual(messages)
    expect(JSON.parse(serializeMessages(messages)).messagesVersion).toBe(MESSAGES_VERSION)
  })

  test('missing or broken data gives an empty conversation', () => {
    expect(parseStoredMessages(null)).toEqual([])
    expect(parseStoredMessages('not json')).toEqual([])
    expect(parseStoredMessages(JSON.stringify({}))).toEqual([])
  })
})

describe('useChatMessages', () => {
  const key = 'general-chat-messages'
  afterEach(() => localStorage.clear())

  test('migrates an old conversation once on load and writes it back as version 2', () => {
    localStorage.setItem(key, oldStored)

    const { result } = renderHook(() => useChatMessages(key))

    expect(result.current[0][1]).toEqual(expect.objectContaining({ parts: [{ type: 'text', text: oldFormatMessages[1].content }] }))
    const stored = JSON.parse(localStorage.getItem(key)!)
    expect(stored.messagesVersion).toBe(2)
    expect(stored.value).toEqual(result.current[0])
    expect(stored.value[1]).not.toHaveProperty('content')
    expect(stored.value[7].parts.filter((part: { type: string }) => part.type === 'tool')).toHaveLength(2)
    expect(stored.value[7]).not.toHaveProperty('toolCalls')
  })

  test('saves new messages', () => {
    const { result } = renderHook(() => useChatMessages(key))
    act(() => result.current[1]([{ role: 'user', content: 'hello' }]))
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ value: [{ role: 'user', content: 'hello' }], messagesVersion: 2 })
  })
})

describe('messageToText', () => {
  // Copy used readMessageContent on the old message; it must give the same text for the migrated one
  test('gives the same text as the old format for every fixture message', () => {
    const migrated = migrateMessages(oldFormatMessages)
    oldFormatMessages.forEach((old, i) => {
      expect(messageToText(migrated[i])).toBe(readMessageContent(old as any))
    })
  })

  test('only text parts count, joined by a blank line', () => {
    expect(
      messageToText({
        role: 'assistant',
        parts: [
          { type: 'text', text: 'first' },
          { type: 'text', text: 'second' },
        ],
      }),
    ).toBe('first\n\nsecond')
  })
})

describe('toHistoryMessages', () => {
  test('assistant messages are sent as their parts (the server summarises tool parts), user messages pass through', () => {
    const migrated = migrateMessages(oldFormatMessages)
    const history = toHistoryMessages(migrated)

    expect(history[0]).toBe(migrated[0])
    expect(history[2]).toBe(migrated[2])
    expect(history[1]).toEqual({ role: 'assistant', parts: [{ type: 'text', text: oldFormatMessages[1].content }] })
    expect(history[5]).toEqual({ role: 'assistant', parts: [] })
    expect(history[7]).toEqual({ role: 'assistant', parts: (migrated[7] as AssistantMessageV2).parts })
    expect((history[7] as { parts: AssistantPart[] }).parts.map((part) => part.type)).toEqual(['tool', 'tool', 'text'])
  })

  test('leaves the artifact and progress of tool parts out', () => {
    const [history] = toHistoryMessages([
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool',
            callId: 'c1',
            name: 'document_search',
            input: { query: 'q' },
            status: 'ok',
            result: { files: [] },
            artifact: { big: true },
            progress: 1,
          },
        ],
      },
    ])

    expect(history).toEqual({
      role: 'assistant',
      parts: [{ type: 'tool', callId: 'c1', name: 'document_search', input: { query: 'q' }, status: 'ok', result: { files: [] } }],
    })
  })
})
