import { User, Service, UserServiceUsage } from '../models'

const createUserServiceUsages = async () => {
  const users = await User.findAll()
  const services = await Service.findAll()

  const operations: any[] = []

  users.forEach((user) => {
    services.forEach(async (service) => {
      const usage = await UserServiceUsage.findOne({
        where: {
          userId: user.id,
          serviceId: service.id,
        },
      })

      if (!usage) {
        const operation = UserServiceUsage.create({
          userId: user.id,
          serviceId: service.id,
          usageCount: 0,
        })

        operations.push(operation)
      }
    })
  })

  await Promise.all(operations)
}

export default createUserServiceUsages
