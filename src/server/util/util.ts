import { Op } from 'sequelize'

import { Message } from '../types'
import { DEFAULT_MODEL } from '../../config'
import { ServiceAccessGroup, Service } from '../db/models'

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

const getCourseModel = async (courseId: string): Promise<string> => {
  const service = await Service.findOne({
    where: {
      courseId,
    },
    attributes: ['model'],
  })

  console.log('service', service)

  return service?.model || DEFAULT_MODEL
}

/**
 * Get the model to use for a given user
 * If the user has access to multiple models, use the largest model
 * If the user has access to no models, use the default model
 */
export const getModel = async (
  iamGroups: string[],
  courseId: string | undefined
): Promise<string> => {
  if (courseId) return getCourseModel(courseId)

  const accessGroups = await ServiceAccessGroup.findAll({
    where: {
      iamGroup: {
        [Op.in]: iamGroups,
      },
    },
    attributes: ['model'],
  })

  const models = accessGroups.map(({ model }) => model)

  if (models.includes('gpt-4')) return 'gpt-4'
  if (models.includes('gpt-3.5-turbo-16k')) return 'gpt-3.5-turbo-16k'
  if (models.includes('gpt-3.5-turbo')) return 'gpt-3.5-turbo'

  return DEFAULT_MODEL
}
