import { AzureChatOpenAI } from '@langchain/openai'
import { ChatGoogle } from '@langchain/google/node'
import { AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID } from 'src/server/util/config'
import { DEFAULT_MODEL_TEMPERATURE, DEFAULT_VERTEX_LOCATION } from '@config'

export const getAzureChatOpenAI = (modelName: string, streaming = true) =>
  new AzureChatOpenAI({
    model: modelName,
    azureOpenAIApiKey: AZURE_API_KEY,
    azureOpenAIApiVersion: '2024-10-21',
    azureOpenAIApiDeploymentName: modelName, // In Azure, always use the acual model name as the deployment name
    azureOpenAIApiInstanceName: AZURE_RESOURCE,
    useResponsesApi: false,
    streaming: streaming,
  })

export const getVertexModelProvider = (modelName: string) => {
  return new ChatGoogle({
    model: modelName,
    platformType: 'gcp',
    location: DEFAULT_VERTEX_LOCATION,
    temperature: DEFAULT_MODEL_TEMPERATURE,
    ...(GOOGLE_CLOUD_PROJECT_ID ? { googleAuthOptions: { projectId: GOOGLE_CLOUD_PROJECT_ID } } : {}),
  })
}
