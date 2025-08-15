import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
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
    messages[0].content = basicTestContent
    console.log(messages)
    return super._generate(messages, _options, _runManager)
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    messages[0].content = basicTestContent
    console.log(messages)
    yield* super._streamResponseChunks(messages, _options, runManager)
  }
}
