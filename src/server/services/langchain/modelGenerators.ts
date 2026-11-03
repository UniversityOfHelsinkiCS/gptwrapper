import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogle } from '@langchain/google/node'
import { AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID, INFERENCE_API_TOKEN, INFERENCE_API_URL } from 'src/server/util/config'
import { DEFAULT_MODEL_TEMPERATURE, DEFAULT_VERTEX_LOCATION, type ModelConfig } from '@config'

export const getAzureChatOpenAI = (modelName: string, streaming = true) =>
  new ChatOpenAI({
    model: modelName,
    configuration: {
      baseURL: `https://${AZURE_RESOURCE}.services.ai.azure.com/openai/v1`
    },
    useResponsesApi: true,
    apiKey: AZURE_API_KEY,
    streaming: streaming
  })


export const getToskaProvider = (modelName: string, streaming = true) =>
  new ChatOpenAI({
    configuration: {
      baseURL: INFERENCE_API_URL,
      defaultHeaders: {
        "token": INFERENCE_API_TOKEN
      }
    },
    useResponsesApi: true,
    streaming: streaming,
    apiKey: 'none'
  })

export const getVertexModelProvider = (modelConfig: Pick<ModelConfig, 'name' | 'modelRegion'>) => {
  return new ChatGoogle({
    model: modelConfig.name,
    platformType: 'gcp',
    location: modelConfig.modelRegion || DEFAULT_VERTEX_LOCATION,
    temperature: DEFAULT_MODEL_TEMPERATURE,
    ...(GOOGLE_CLOUD_PROJECT_ID ? { googleAuthOptions: { projectId: GOOGLE_CLOUD_PROJECT_ID } } : {}),
  })
}
