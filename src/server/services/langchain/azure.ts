import { AzureChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { AZURE_API_KEY, AZURE_RESOURCE } from "src/server/util/config";

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
    streaming,
    zdrEnabled: true,
  })
