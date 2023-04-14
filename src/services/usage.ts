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
