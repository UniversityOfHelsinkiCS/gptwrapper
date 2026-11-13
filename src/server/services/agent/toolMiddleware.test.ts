// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import { BaseChatModel, type BindToolsInput } from '@langchain/core/language_models/chat_models'
import { AIMessage, type BaseMessage, isSystemMessage } from '@langchain/core/messages'
import type { ChatResult } from '@langchain/core/outputs'
import { tool } from '@langchain/core/tools'
import { createAgent, ToolMessage } from 'langchain'
import { z } from 'zod/v4'

vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { callLimitMessage, callLimitMiddleware, FINAL_ANSWER_NOTE, modelCallBudgetMiddleware } from './toolMiddleware'

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

/** Calls the `echo` tool on every call, unless bound with `tool_choice: 'none'`. Records how each call was bound and its system text. */
class LoopingModel extends BaseChatModel {
  constructor(
    readonly calls: { toolChoice: unknown; system: string }[] = [],
    private readonly ignoreToolChoice = false,
    private readonly toolChoice?: unknown,
  ) {
    super({})
  }

  _llmType() {
    return 'looping'
  }

  override bindTools(_tools: BindToolsInput[], kwargs?: { tool_choice?: unknown }) {
    return new LoopingModel(this.calls, this.ignoreToolChoice, kwargs?.tool_choice) as any
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.calls.push({ toolChoice: this.toolChoice, system: messages.find(isSystemMessage)?.text ?? '' })
    const n = this.calls.length
    const message =
      this.toolChoice === 'none' && !this.ignoreToolChoice
        ? new AIMessage('final answer')
        : new AIMessage({ content: '', tool_calls: [{ name: 'echo', args: { n }, id: `call_${n}`, type: 'tool_call' }] })
    return { generations: [{ text: message.text, message }] }
  }
}

const echo = tool(async ({ n }: { n: number }) => `echo ${n}`, { name: 'echo', description: 'Echoes n.', schema: z.object({ n: z.number() }) })

const runLoop = (model: LoopingModel, maxModelCalls: number) =>
  createAgent({ model, tools: [echo], systemPrompt: 'Be helpful.', middleware: [modelCallBudgetMiddleware(maxModelCalls)] }).invoke(
    { messages: [{ role: 'user', content: 'read everything' }] },
    { recursionLimit: 2 * maxModelCalls + 5 },
  )

describe('modelCallBudgetMiddleware', () => {
  test('makes the last allowed model call without tools, so the run ends with an answer instead of a recursion error', async () => {
    const model = new LoopingModel()
    const result = await runLoop(model, 4)

    expect(model.calls.map((call) => call.toolChoice === 'none')).toEqual([false, false, false, true])
    expect(model.calls[3].system).toContain(FINAL_ANSWER_NOTE)
    expect(model.calls[2].system).not.toContain(FINAL_ANSWER_NOTE)
    expect(result.messages.filter((message) => ToolMessage.isInstance(message))).toHaveLength(3)
    expect(result.messages.at(-1)?.text).toBe('final answer')
  })

  test('drops tool calls that the model still makes in its last call, so the run ends there', async () => {
    const model = new LoopingModel([], true)
    const result = await runLoop(model, 3)

    expect(model.calls).toHaveLength(3)
    const last = result.messages.at(-1)
    expect(AIMessage.isInstance(last) && last.tool_calls?.length).toBeFalsy()
  })

  test('a run without the budget hits the recursion limit (what the budget prevents)', async () => {
    const agent = createAgent({ model: new LoopingModel(), tools: [echo] })
    await expect(agent.invoke({ messages: [{ role: 'user', content: 'read everything' }] }, { recursionLimit: 13 })).rejects.toThrow(/Recursion limit/)
  })
})
