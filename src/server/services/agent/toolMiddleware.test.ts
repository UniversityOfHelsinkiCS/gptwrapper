// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import { ToolMessage } from 'langchain'

vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { callLimitMessage, callLimitMiddleware } from './toolMiddleware'

type WrapToolCall = (request: unknown, handler: (request: unknown) => Promise<ToolMessage>) => Promise<ToolMessage>

const callOf = (name: string, id: string) => ({ toolCall: { name, id, args: {} } })

const okHandler = vi.fn(async (request: unknown) => {
  const { toolCall } = request as ReturnType<typeof callOf>
  return new ToolMessage({ content: 'ok', tool_call_id: toolCall.id, name: toolCall.name })
})

describe('callLimitMiddleware', () => {
  test('runs calls up to the limit and refuses later ones with an error the model reads; other tools are not counted', async () => {
    const wrap = callLimitMiddleware(new Map([['read_pdf', 2]])).wrapToolCall as unknown as WrapToolCall
    const results = await Promise.all(['1', '2', '3'].map((id) => wrap(callOf('read_pdf', id), okHandler)))
    const others = await Promise.all(['4', '5', '6'].map((id) => wrap(callOf('read_file', id), okHandler)))

    expect(results.map((message) => message.status === 'error')).toEqual([false, false, true])
    expect(results[2]).toMatchObject({ content: callLimitMessage('read_pdf', 2), tool_call_id: '3', name: 'read_pdf' })
    expect(others.every((message) => message.content === 'ok')).toBe(true)
    expect(okHandler).toHaveBeenCalledTimes(5)
  })

  test('counts per middleware, so each run starts from zero', async () => {
    const limits = new Map([['read_pdf', 1]])
    const first = callLimitMiddleware(limits).wrapToolCall as unknown as WrapToolCall
    const second = callLimitMiddleware(limits).wrapToolCall as unknown as WrapToolCall
    expect((await first(callOf('read_pdf', '1'), okHandler)).content).toBe('ok')
    expect((await second(callOf('read_pdf', '2'), okHandler)).content).toBe('ok')
    expect((await first(callOf('read_pdf', '3'), okHandler)).status).toBe('error')
  })
})
