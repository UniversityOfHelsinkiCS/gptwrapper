import { OpenAIClient, AzureKeyCredential } from '@azure/openai'

import { AzureOptions, APIError } from '../types'
import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels } from '../../config'
import logger from './logger'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

const client = new OpenAIClient(endpoint, new AzureKeyCredential(AZURE_API_KEY))

export const getCompletionEvents = async ({
  model,
  messages,
}: AzureOptions) => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId) throw new Error(`Invalid model: ${model}`)

  try {
    const events = await client.streamChatCompletions(deploymentId, messages)

    return events
  } catch (error: any) {
    logger.error(error)

    return { error } as any as APIError
  }
}
