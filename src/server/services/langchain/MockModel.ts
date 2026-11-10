import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { BaseChatModel, type BaseChatModelParams, type BindToolsInput } from '@langchain/core/language_models/chat_models'
import { AIMessage, AIMessageChunk, type BaseMessage, isHumanMessage, isSystemMessage, isToolMessage } from '@langchain/core/messages'
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs'
import type { StructuredTool } from '@langchain/core/tools'
import { fakeModel } from 'langchain'
import { setTimeout as sleep } from 'node:timers/promises'
import { PRESENT_QUIZ } from '@shared/quiz'
import { QUIZ_ANSWER_PREFIX } from '../agent/tools/presentQuiz'
import {
  basicTestContent,
  codeTestContent,
  mathTestContent,
  mockSubagentLeadIn,
  mockSubagentSystemPrompt,
  mockSubagentTask,
  mockSubagentUsage,
  mockMultiQuiz,
  mockQuiz,
  mockQuizLeadIn,
  mockQuizReply,
  thinkReasoningChunks,
  thinkTestAnswer,
} from './mockContent'

/** Pause between the streamed chunks of a `think` answer, so the thinking block is seen while it streams. */
const THINK_CHUNK_DELAY_MS = 250

const lastHumanText = (messages: BaseMessage[]): string => (messages.findLast(isHumanMessage)?.content ?? '') as string

/** `think <answer>` reasons first (in several chunks), then answers with `<answer>`. Not for tool results: the agent's second call answers normally. */
const isThinkRequest = (messages: BaseMessage[]) => {
  const last = messages.at(-1)
  return lastHumanText(messages).startsWith('think') && !(last && isToolMessage(last))
}

const thinkAnswer = (messages: BaseMessage[]) => lastHumanText(messages).slice('think'.length).trim() || thinkTestAnswer

export class MockModel extends BaseChatModel {
  tools: StructuredTool[]

  constructor({ tools, ...rest }: { tools: StructuredTool[] } & BaseChatModelParams) {
    super(rest)
    this.tools = tools
  }

  _llmType() {
    return 'mock'
  }

  /** Names of the tools bound by createAgent. */
  private boundToolNames: string[] = []

  /**
   * createAgent requires bindTools. The mock picks its tool calls from the message prefix (`rag`, `multitool`),
   * so binding only records the tool names. Construct it with `tools: []` for createAgent, which refuses pre-bound tools.
   */
  override bindTools(tools: BindToolsInput[]) {
    this.boundToolNames = tools.flatMap((t) => (typeof t === 'object' && t !== null && 'name' in t && typeof t.name === 'string' ? [t.name] : []))
    return this
  }

  /** v3 binds `mock_document_search` through the constructor; the agent (v4) binds the registry's `document_search`. */
  private get searchToolName() {
    const names = [...this.tools.map((t) => t.name), ...this.boundToolNames]
    return names.find((name) => name === 'mock_document_search') ?? names.find((name) => name === 'document_search') ?? 'mock_document_search'
  }

  private buildFake(messages: BaseMessage[]) {
    const lastHuman = lastHumanText(messages)
    // `text` also reads the content-block array that createAgent's `systemPrompt` becomes.
    const systemText = messages.find(isSystemMessage)?.text
    const last = messages[messages.length - 1]

    if (systemText === mockSubagentSystemPrompt && last && isToolMessage(last) && lastHuman.includes('fail')) {
      // A subagent task with `fail` in it fails midway: after its tool call, before its answer.
      return fakeModel().respond(new Error('Mock subagent error injected'))
    }
    if (last && isToolMessage(last)) {
      return fakeModel().respond(new AIMessage(`Ok! Got some great results from that mock tool call!: "${last.content}"`))
    }
    if (systemText === mockSubagentSystemPrompt) {
      // The agent of the `mock_subagent` tool: some text and a lookup of its task, then the generic tool-result answer above.
      return fakeModel().respond(
        new AIMessage({
          content: mockSubagentLeadIn,
          tool_calls: [{ name: 'mock_lookup', args: { query: lastHuman }, id: 'mock_lookup_id', type: 'tool_call' }],
          usage_metadata: mockSubagentUsage,
        }),
      )
    }
    if (systemText?.startsWith('mocktest')) {
      // Echoes the teacher's system message, without the instructions of the enabled tools appended to it.
      return fakeModel().respond(new AIMessage(systemText.split('\n\n## Tool: ')[0]))
    }
    if (lastHuman.startsWith(QUIZ_ANSWER_PREFIX)) {
      // The reply to a quiz answer. An answer whose explanation contains `fail` fails, to test regenerating the reply.
      if (lastHuman.includes('fail')) return fakeModel().respond(new Error('Mock error injected'))
      return fakeModel().respond(new AIMessage(mockQuizReply(/^Result: (.+)$/m.exec(lastHuman)?.[1] ?? 'not checked')))
    }
    if (lastHuman.startsWith('quiz')) {
      // A short lead-in and a `present_quiz` call (added for the mock model). The turn ends at the quiz.
      const quiz = lastHuman.startsWith('quiz multi') ? mockMultiQuiz : mockQuiz
      return fakeModel().respond(
        new AIMessage({ content: mockQuizLeadIn, tool_calls: [{ name: PRESENT_QUIZ, args: quiz, id: 'mock_quiz_id', type: 'tool_call' }] }),
      )
    }
    if (lastHuman.startsWith('say ')) {
      return fakeModel().respond(new AIMessage(lastHuman.replace('say ', '')))
    }
    if (lastHuman.startsWith('rag')) {
      return fakeModel().respond(
        new AIMessage({
          content: '',
          tool_calls: [{ name: this.searchToolName, args: { query: 'mock test query' }, id: 'mock_document_search_id', type: 'tool_call' }],
        }),
      )
    }
    if (lastHuman.startsWith('subagent')) {
      // `subagent <task>` delegates the task (or a default one) to the `mock_subagent` tool, added for the mock model.
      return fakeModel().respond(
        new AIMessage({
          content: '',
          tool_calls: [
            { name: 'mock_subagent', args: { task: lastHuman.slice('subagent'.length).trim() || mockSubagentTask }, id: 'mock_subagent_id', type: 'tool_call' },
          ],
        }),
      )
    }
    if (lastHuman.startsWith('multitool')) {
      // Two tool calls in one turn, to test that both results end up in order in the answer.
      return fakeModel().respond(
        new AIMessage({
          content: '',
          tool_calls: [
            { name: this.searchToolName, args: { query: 'first mock query' }, id: 'mock_multitool_1', type: 'tool_call' },
            { name: this.searchToolName, args: { query: 'second mock query' }, id: 'mock_multitool_2', type: 'tool_call' },
          ],
        }),
      )
    }
    if (lastHuman.startsWith('math')) {
      return fakeModel().respond(new AIMessage(mathTestContent))
    }
    if (lastHuman.startsWith('code')) {
      return fakeModel().respond(new AIMessage(codeTestContent))
    }
    if (lastHuman.startsWith('midway fail') || lastHuman.startsWith('incomplete fail') || lastHuman.startsWith('fail')) {
      // The new fakeModel can only throw at call start, not mid-stream.
      return fakeModel().respond(new Error('Mock error injected'))
    }
    return fakeModel().respond(new AIMessage(basicTestContent))
  }

  /**
   * Calls the fake model's `_generate` directly instead of `invoke`/`stream`. Going through the Runnable
   * interface makes the inner fake model a child run that inherits the callbacks (also from the async
   * context inside a LangGraph run), so agent.stream's `messages` mode would report every message twice.
   */
  private async respond(messages: BaseMessage[], options: this['ParsedCallOptions']): Promise<AIMessage> {
    const result = await this.buildFake(messages)._generate(messages, { signal: options.signal } as typeof options)
    return result.generations[0].message as AIMessage
  }

  async _generate(messages: BaseMessage[], options: this['ParsedCallOptions'], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
    if (isThinkRequest(messages)) {
      const message = new AIMessage({
        content: [
          { type: 'reasoning', reasoning: thinkReasoningChunks.join('') },
          { type: 'text', text: thinkAnswer(messages) },
        ],
      })
      return { generations: [{ text: thinkAnswer(messages), message }] }
    }
    const message = await this.respond(messages, options)
    return {
      generations: [{ text: extractText(message.content), message }],
    }
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    if (isThinkRequest(messages)) {
      yield* streamThinkingChunks(messages, options.signal, runManager)
      return
    }
    const message = await this.respond(messages, options)
    const chunk = new AIMessageChunk({ id: message.id, content: message.content, tool_calls: message.tool_calls, usage_metadata: message.usage_metadata })
    const text = extractText(chunk.content)
    await runManager?.handleLLMNewToken(text)
    yield new ChatGenerationChunk({ message: chunk, text })
  }
}

/** Streams `reasoning` content blocks (the standard block type the providers' reasoning is converted to), then the answer. */
async function* streamThinkingChunks(
  messages: BaseMessage[],
  signal: AbortSignal | undefined,
  runManager?: CallbackManagerForLLMRun,
): AsyncGenerator<ChatGenerationChunk> {
  for (const reasoning of thinkReasoningChunks) {
    await sleep(THINK_CHUNK_DELAY_MS, undefined, { signal })
    const chunk = new ChatGenerationChunk({ message: new AIMessageChunk({ content: [{ type: 'reasoning', reasoning }] }), text: '' })
    // With the chunk, agent.stream's `messages` mode reports the content blocks, not only the token text.
    await runManager?.handleLLMNewToken('', undefined, undefined, undefined, undefined, { chunk })
    yield chunk
  }
  await sleep(THINK_CHUNK_DELAY_MS, undefined, { signal })
  const text = thinkAnswer(messages)
  await runManager?.handleLLMNewToken(text)
  yield new ChatGenerationChunk({ message: new AIMessageChunk({ content: [{ type: 'text', text }] }), text })
}

const extractText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content.reduce<string>((acc, block) => acc + extractText(block), '')
  }
  if (content && typeof content === 'object' && 'text' in content && typeof (content as { text: unknown }).text === 'string') {
    return (content as { text: string }).text
  }
  return ''
}
