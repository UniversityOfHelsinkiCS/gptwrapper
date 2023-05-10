import { CreateChatCompletionRequest } from 'openai'
import { Tiktoken } from '@dqbd/tiktoken'

import { User, Service as ServiceType } from '../types'
import { Service, UserServiceUsage } from '../db/models'
import logger from '../util/logger'

const getUsageLimit = async (serviceId: string) => {
  const service = await Service.findByPk(serviceId, {
    attributes: ['usageLimit'],
  })

  if (!service) throw new Error('Service not found')

  return service.usageLimit
}

export const checkUsage = async (
  user: User,
  service: ServiceType
): Promise<boolean> => {
  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  let usageLimit = await getUsageLimit(service.id)

  if (user.isAdmin) return true

  if (user.iamGroups.includes('grp-curregpt')) usageLimit *= 2

  if (serviceUsage.usageCount >= usageLimit) {
    logger.info('Usage limit reached', {
      user,
      service,
      serviceUsage,
      usageLimit,
    })

    return false
  }

  logger.info('Usage check passed', {
    user,
    service,
    serviceUsage,
    usageLimit,
  })

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
    const encoded = encoding.encode(message.content)
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

  serviceUsage?.increment('usageCount', { by: tokenCount })
}
