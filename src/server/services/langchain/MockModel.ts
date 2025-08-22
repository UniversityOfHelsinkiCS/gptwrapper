import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { isSystemMessage } from '@langchain/core/messages'
import { BaseMessage } from '@langchain/core/messages'
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import { FakeStreamingChatModel } from '@langchain/core/utils/testing'
import { basicTestContent } from '../../util/azure/mocks/mockContent'

/**
 * See https://github.com/langchain-ai/langchainjs/blob/fe79533d36ddf92b830ea231297b522fce1c538f/langchain-core/src/utils/testing/index.ts#L219
 *
 * FakeStreamingChatModel echoes the first input message out of the box.
 */
export class MockModel extends FakeStreamingChatModel {
  constructor() {
    super({
      sleep: 5,
    })
  }

  async _generate(messages: BaseMessage[], _options: this['ParsedCallOptions'], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
    const firstMessage = messages[0]
    if (isSystemMessage(firstMessage) && (firstMessage.content as string).startsWith('mocktest')) {
      // Do nothing. FakeStreamingChatModel echoes the first message.
    } else {
      firstMessage.content = basicTestContent
    }
    return super._generate(messages, _options, _runManager)
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const firstMessage = messages[0]
    if (isSystemMessage(firstMessage) && (firstMessage.content as string).startsWith('mocktest')) {
      // Do nothing. FakeStreamingChatModel echoes the first message.
    } else {
      firstMessage.content = basicTestContent
    }
    yield* super._streamResponseChunks(messages, _options, runManager)
  }
}
