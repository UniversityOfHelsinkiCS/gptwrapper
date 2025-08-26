import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { AIMessage, AIMessageChunk, type BaseMessage, isHumanMessage, isSystemMessage, isToolMessage } from '@langchain/core/messages'
import type { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import { FakeStreamingChatModel } from '@langchain/core/utils/testing'
import { basicTestContent } from '../../util/azure/mocks/mockContent'
import { StructuredTool } from '@langchain/core/tools'

/**
 * See https://github.com/langchain-ai/langchainjs/blob/fe79533d36ddf92b830ea231297b522fce1c538f/langchain-core/src/utils/testing/index.ts#L219
 *
 * FakeStreamingChatModel echoes the first input message out of the box.
 */
export class MockModel extends FakeStreamingChatModel {
  temperature: number

  constructor({ tools, temperature }: { tools: StructuredTool[]; temperature: number }) {
    super({
      sleep: 5,
    })
    this.bindTools(tools)
    this.temperature = temperature
  }

  setupTestResponse(messages: BaseMessage[]) {
    const firstSystemMessage = messages.find(isSystemMessage)
    const lastHumanMessage = (messages.findLast(isHumanMessage)?.content ?? '') as string
    const toolMessage = isToolMessage(messages[messages.length - 1]) ? messages[messages.length - 1] : null

    if (toolMessage) {
      this.chunks = [new AIMessageChunk(`Ok! Got some great results from that mock tool call!: "${toolMessage.content}"`)]
    } else if (firstSystemMessage && (firstSystemMessage.content as string).startsWith('mocktest')) {
      // testing a system message
      // Do nothing. FakeStreamingChatModel echoes the first message.
    } else if (lastHumanMessage.startsWith('rag')) {
      // Do a tool call
      this.chunks = toolCallChunks
    } else if (lastHumanMessage.startsWith('temperature')) {
      // Echo the temperature
      this.chunks = [new AIMessageChunk(`Temperature: ${this.temperature}`)]
    } else {
      this.responses = defaultResponse
    }
  }

  async _generate(messages: BaseMessage[], _options: this['ParsedCallOptions'], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
    this.setupTestResponse(messages)
    return super._generate(messages, _options, _runManager)
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    this.setupTestResponse(messages)
    yield* super._streamResponseChunks(messages, _options, runManager)
  }
}

const defaultResponse = [new AIMessage(basicTestContent)]

const toolCallChunks = [
  new AIMessageChunk({
    content: '',
    tool_call_chunks: [
      {
        name: 'mock_document_search',
        args: JSON.stringify({ query: 'mock test query' }),
        id: 'mock_document_search_id',
      },
    ],
  }),
]
