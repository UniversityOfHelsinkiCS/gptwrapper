import { User } from '../types'
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
  serviceId: string
): Promise<boolean> => {
  const [serviceUsage] = await UserServiceUsage.findOrCreate({
    where: {
      userId: user.id,
      serviceId,
    },
  })

  const usageLimit = await getUsageLimit(serviceId)

  if (serviceUsage.usageCount >= usageLimit) return false

  serviceUsage.increment('usageCount')

  return true
}

export const decrementUsage = async (user: User, serviceId: string) => {
  const serviceUsage = await UserServiceUsage.findOne({
    where: {
      userId: user.id,
      serviceId,
    },
  })

  serviceUsage?.decrement('usageCount')
}
