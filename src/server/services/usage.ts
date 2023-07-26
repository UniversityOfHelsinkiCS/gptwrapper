import { CreateChatCompletionRequest } from 'openai'
import { Tiktoken } from '@dqbd/tiktoken'
import { Op } from 'sequelize'

import { User, Service } from '../types'
import { UserServiceUsage, ServiceAccessGroup } from '../db/models'
import logger from '../util/logger'

// Get largest usage limit for user based on their IAM groups
// If no usage limit is found, return the service's default usage limit
const getUsageLimit = async (service: Service, user: User): Promise<number> => {
  const accessGroups = await ServiceAccessGroup.findAll({
    where: {
      serviceId: service.id,
      iamGroup: {
        [Op.in]: user.iamGroups,
      },
    },
    attributes: ['usageLimit'],
  })

  const usageLimits = accessGroups
    .map(({ usageLimit }) => usageLimit)
    .filter(Boolean)

  if (usageLimits.length) return Math.max(...usageLimits)

  return service.usageLimit
}

export const checkUsage = async (
  user: User,
  service: Service
): Promise<boolean> => {
  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  const usageLimit = await getUsageLimit(service, user)

  if (!user.isAdmin && serviceUsage.usageCount >= usageLimit) {
    logger.info('Usage limit reached', { user, service, serviceUsage })

    return false
  }

  return true
}

export const calculateUsage = (
  options: CreateChatCompletionRequest,
  encoding: Tiktoken
): number => {
  const { messages } = options

  let tokenCount = 0
  // eslint-disable-next-line no-restricted-syntax
  for (const message of messages) {
    const encoded = encoding.encode(message.content || '')
    tokenCount += encoded.length
  }

  return tokenCount
}

export const incrementUsage = async (
  user: User,
  serviceId: string,
  tokenCount: number
) => {
  const serviceUsage = await UserServiceUsage.findOne({
    where: {
      userId: user.id,
      serviceId,
    },
  })

  if (!serviceUsage) throw new Error('User service usage not found')

  serviceUsage.usageCount += tokenCount

  await serviceUsage.save()
}
