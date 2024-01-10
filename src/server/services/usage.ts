import { Tiktoken } from '@dqbd/tiktoken'
import { Op } from 'sequelize'

import { tikeIam } from '../util/config'
import { User, Service as ServiceType, StreamingOptions } from '../types'
import { Service, UserServiceUsage, ServiceAccessGroup } from '../db/models'
import { getModel, getAllowedModels } from '../util/util'
import logger from '../util/logger'

// Get largest usage limit for user based on their IAM groups
// If no usage limit is found, return the service's default usage limit
const getIamUsageLimit = async (
  service: ServiceType,
  user: User
): Promise<number> => {
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
  service: ServiceType,
  courseId?: string
): Promise<boolean> => {
  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId: service.id,
    },
  })

  const usageLimit = courseId
    ? service.usageLimit
    : await getIamUsageLimit(service, user)

  if (!user.isAdmin && serviceUsage.usageCount >= usageLimit) {
    logger.info('Usage limit reached')

    return false
  }

  return true
}

export const calculateUsage = (
  options: StreamingOptions,
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

export const getUserStatus = async (user: User, serviceId: string) => {
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

  const model = await getModel(
    user.iamGroups,
    service?.courseId,
    user.isAdmin,
    isTike
  )
  const models = getAllowedModels(model)

  const limit =
    service.id === 'chat'
      ? await getIamUsageLimit(service, user)
      : service?.usageLimit ?? 0

  return {
    usage: serviceUsage?.usageCount ?? 0,
    limit,
    model,
    models,
    isTike,
  }
}
