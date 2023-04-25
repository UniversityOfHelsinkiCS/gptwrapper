import { CreateChatCompletionRequest } from 'openai'
import { Tiktoken } from '@dqbd/tiktoken'

import { User, Service as ServiceType } from '../types'
import { Service, UserServiceUsage } from '../db/models'

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
  if (user.isAdmin) return true

  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  const usageLimit = await getUsageLimit(service.id)

  if (serviceUsage.usageCount >= usageLimit) return false

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
