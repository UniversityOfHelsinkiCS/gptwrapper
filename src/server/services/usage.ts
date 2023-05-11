import { CreateChatCompletionRequest } from 'openai'
import { Tiktoken } from '@dqbd/tiktoken'

import { User, Service as ServiceType } from '../types'
import { UserServiceUsage } from '../db/models'

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

  const usageCount = BigInt(serviceUsage.usageCount)

  let usageLimit = BigInt(service.usageLimit)
  if (user.iamGroups.includes('grp-curregpt')) usageLimit *= BigInt(2)

  if (usageCount >= usageLimit) return false

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

  if (!serviceUsage) throw new Error('User service usage not found')

  serviceUsage.usageCount = String(
    BigInt(serviceUsage.usageCount) + BigInt(tokenCount)
  )

  await serviceUsage.save()
}
