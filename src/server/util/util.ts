import { Message } from '../types'
import { DEFAULT_MODEL, DEFAUL_CONTEXT_LIMIT, validModels } from '../../config'
import { ChatInstance } from '../db/models'

/**
 * Filter out messages in a long conversation to save costs
 * and to stay within context limit.
 * Always keep system messages and last 10 messages
 */
export const getMessageContext = (messages: Message[]): Message[] => {
  const systemMessages = messages.filter((message) => message.role === 'system')
  const otherMessages = messages.filter((message) => message.role !== 'system')

  const latestMessages = otherMessages.slice(-10)

  return systemMessages.concat(latestMessages)
}

export const getCourseModel = async (courseId: string): Promise<string> => {
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['model'],
  })

  return chatInstance?.model || DEFAULT_MODEL
}

export const getAllowedModels = (model: string): string[] => {
  const allModels = validModels.map(({ name }) => name)

  if (model === 'gpt-4') return allModels

  return ['gpt-3.5-turbo']
}

export const getModelContextLimit = (modelName: string) => {
  const model = validModels.find(({ name }) => name === modelName)

  if (!model) return DEFAUL_CONTEXT_LIMIT

  return model.context
}

export const sleep =
  // eslint-disable-next-line no-promise-executor-return
  (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
