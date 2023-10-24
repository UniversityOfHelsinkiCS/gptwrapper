import { OpenAIClient, AzureKeyCredential } from '@azure/openai'

import { StreamingOptions, Message } from '../types'
import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels } from '../../config'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

const client = new OpenAIClient(endpoint, new AzureKeyCredential(AZURE_API_KEY))

export const getCompletionEvents = async (
  model: string,
  messages: Message[],
  options: StreamingOptions
) => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId) throw new Error(`Invalid model: ${model}`)

  const events = client.listChatCompletions(deploymentId, messages)

  console.log(options)

  return events
}
