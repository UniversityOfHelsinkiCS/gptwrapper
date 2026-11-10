import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { BaseChatModel, type BaseChatModelParams, type BindToolsInput } from '@langchain/core/language_models/chat_models'
import { AIMessage, AIMessageChunk, type BaseMessage, isHumanMessage, isSystemMessage, isToolMessage } from '@langchain/core/messages'
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs'
import type { StructuredTool } from '@langchain/core/tools'
import { fakeModel } from 'langchain'
import { basicTestContent, codeTestContent, mathTestContent } from './mockContent'

export class MockModel extends BaseChatModel {
  tools: StructuredTool[]

  constructor({ tools, ...rest }: { tools: StructuredTool[] } & BaseChatModelParams) {
    super(rest)
    this.tools = tools
  }

  _llmType() {
    return 'mock'
  }

  /**
   * createAgent requires bindTools. The mock picks its tool calls from the message prefix (`rag`, ...),
   * so binding is a no-op. Construct it with `tools: []` for createAgent, which refuses pre-bound tools.
   */
  override bindTools(_tools: BindToolsInput[]) {
    return this
  }

  private buildFake(messages: BaseMessage[]) {
    const lastHuman = (messages.findLast(isHumanMessage)?.content ?? '') as string
    const firstSystem = messages.find(isSystemMessage)
    const last = messages[messages.length - 1]

    if (last && isToolMessage(last)) {
      return fakeModel().respond(new AIMessage(`Ok! Got some great results from that mock tool call!: "${last.content}"`))
    }
    if (firstSystem && (firstSystem.content as string).startsWith('mocktest')) {
      return fakeModel().respond(new AIMessage(firstSystem.content as string))
    }
    if (lastHuman.startsWith('say ')) {
      return fakeModel().respond(new AIMessage(lastHuman.replace('say ', '')))
    }
    if (lastHuman.startsWith('rag')) {
      return fakeModel().respond(
        new AIMessage({
          content: '',
          tool_calls: [{ name: 'mock_document_search', args: { query: 'mock test query' }, id: 'mock_document_search_id', type: 'tool_call' }],
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
    const message = await this.respond(messages, options)
    const chunk = new AIMessageChunk({ id: message.id, content: message.content, tool_calls: message.tool_calls })
    const text = extractText(chunk.content)
    await runManager?.handleLLMNewToken(text)
    yield new ChatGenerationChunk({ message: chunk, text })
  }
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
