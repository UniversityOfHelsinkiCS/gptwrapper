import { CreateChatCompletionRequest } from 'openai'
import { Tiktoken } from '@dqbd/tiktoken'

import { doubleUsageIams } from '../util/config'
import { User, Service } from '../types'
import { UserServiceUsage } from '../db/models'
import logger from '../util/logger'

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

  let { usageLimit } = service

  if (user.iamGroups.some((iam) => doubleUsageIams.includes(iam)))
    usageLimit *= 2

  if (!user.isAdmin && serviceUsage.usageCount >= usageLimit) {
    logger.info('Usage limit reached')
    logger.info({ user, service, serviceUsage })

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
