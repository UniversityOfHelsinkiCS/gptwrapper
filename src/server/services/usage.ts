import { Tiktoken } from '@dqbd/tiktoken'

import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { tikeIam } from '../util/config'
import { User as UserType, StreamingOptions, AzureOptions } from '../types'
import { Service, UserServiceUsage, User } from '../db/models'
import { getCourseModel, getAllowedModels } from '../util/util'
import logger from '../util/logger'

export const getUsage = async (userId: string) => {
  const { usage } = await User.findByPk(userId, {
    attributes: ['usage'],
  })

  return usage
}

export const checkUsage = async ({
  id,
  isAdmin,
}: UserType): Promise<boolean> => {
  const usage = await getUsage(id)

  return !isAdmin && usage >= DEFAULT_TOKEN_LIMIT
}

export const checkCourseUsage = async (
  user: UserType,
  courseId: string
): Promise<boolean> => {
  const service = await Service.findOne({
    where: {
      courseId,
    },
  })

  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  if (!user.isAdmin && serviceUsage.usageCount >= service.usageLimit) {
    logger.info('Usage limit reached')

    return false
  }

  return true
}

export const calculateUsage = (
  options: StreamingOptions | AzureOptions,
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

export const incrementUsage = async (user: UserType, tokenCount: number) => {
  await User.increment('usage', {
    by: tokenCount,
    where: {
      id: user.id,
    },
  })
}

export const incrementCourseUsage = async (
  user: UserType,
  courseId: string,
  tokenCount: number
) => {
  const service = await Service.findOne({
    where: {
      courseId,
    },
    attributes: ['id'],
  })

  const serviceUsage = await UserServiceUsage.findOne({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  if (!serviceUsage) throw new Error('User service usage not found')

  serviceUsage.usageCount += tokenCount

  await serviceUsage.save()
}

export const getUserStatus = async (user: UserType, serviceId: string) => {
  const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  const service = await Service.findByPk(serviceId, {
    attributes: ['id', 'usageLimit', 'courseId'],
  })

  const serviceUsage = await UserServiceUsage.findOne({
    where: {
      serviceId,
      userId: user.id,
    },
    attributes: ['usageCount'],
  })

  const model = await getCourseModel(service.courseId)
  const models = getAllowedModels(model)

  return {
    usage: serviceUsage?.usageCount ?? 0,
    limit: service?.usageLimit ?? 0,
    model,
    models,
    isTike,
  }
}
