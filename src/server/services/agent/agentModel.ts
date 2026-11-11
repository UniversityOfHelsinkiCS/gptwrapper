import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ModelProvider, type ModelConfig } from '@config'
import { MockModel } from '../langchain/MockModel'
import { getAzureChatOpenAI, getToskaProvider, getVertexModelProvider } from '../langchain/modelGenerators'

/** The chat model without bound tools: createAgent binds the tools itself and refuses a pre-bound model. */
export const getAgentModel = (modelConfig: ModelConfig): BaseChatModel => {
  switch (modelConfig.provider) {
    case ModelProvider.Azure:
      return getAzureChatOpenAI(modelConfig.name, true, modelConfig.reasoning)
    case ModelProvider.Vertex:
      return getVertexModelProvider(modelConfig)
    case ModelProvider.Toska:
      return getToskaProvider(modelConfig.name, true, modelConfig.reasoning)
    case ModelProvider.Mock:
      return new MockModel({})
    default:
      throw new Error(`Unknown model provider: ${modelConfig.provider}`)
  }
}
