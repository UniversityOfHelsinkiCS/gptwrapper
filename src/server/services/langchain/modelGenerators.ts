import { AzureChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai'
import { ChatGoogle } from '@langchain/google/node'
import { AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID } from 'src/server/util/config'
import { DEFAULT_MODEL_TEMPERATURE, DEFAULT_VERTEX_LOCATION } from '@config'
import { ChatModel } from './chat'

export const getAzureChatOpenAI = (modelName: string) =>
  new AzureChatOpenAI({
    model: modelName,
    azureOpenAIApiKey: AZURE_API_KEY,
    azureOpenAIApiVersion: '2024-10-21',
    azureOpenAIApiDeploymentName: modelName, // In Azure, always use the acual model name as the deployment name
    azureOpenAIApiInstanceName: AZURE_RESOURCE,
    useResponsesApi: false,
    streaming: true,
  })

export const getVertexModelProvider = (modelName: string): ChatModel => {
  return new ChatGoogle({
    model: modelName,
    platformType: 'gcp',
    location: DEFAULT_VERTEX_LOCATION,
    temperature: DEFAULT_MODEL_TEMPERATURE,
    ...(GOOGLE_CLOUD_PROJECT_ID ? { googleAuthOptions: { projectId: GOOGLE_CLOUD_PROJECT_ID } } : {}),
  })
}
