import { DEFAULT_MODEL_TEMPERATURE, DEFAULT_VERTEX_LOCATION } from "@config";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { AzureChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID } from "src/server/util/config";
import { ChatModel } from "./chat";

interface AzureModelConfig {
  name: string;
  temperature: number;
  streaming?: boolean;
}

export const getAzureChatOpenAI = ({ name, temperature, streaming = true }: AzureModelConfig) => 
  new AzureChatOpenAI<ChatOpenAICallOptions>({
    model: name,
    azureOpenAIApiKey: AZURE_API_KEY,
    azureOpenAIApiVersion: '2024-10-21',
    azureOpenAIApiDeploymentName: name, // In Azure, always use the acual model name as the deployment name
    azureOpenAIApiInstanceName: AZURE_RESOURCE,
    temperature: temperature,
    reasoning: {
      effort: 'minimal',
      summary: null,
      generate_summary: null,
    },
    streaming,
    zdrEnabled: true,
  })


  export const getVertexModelProvider = (modelName: string): ChatModel => {
    return new ChatVertexAI({
      model: modelName,
      location: DEFAULT_VERTEX_LOCATION,
      temperature: DEFAULT_MODEL_TEMPERATURE,
      platformType: 'gcp',
      ...(GOOGLE_CLOUD_PROJECT_ID
        ? { authOptions: { projectId: GOOGLE_CLOUD_PROJECT_ID } }
        : {}),
    })
  }