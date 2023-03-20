import { Service } from '../models'

const services = [
  {
    id: 'testService',
    name: 'Test Service',
    description: 'This is a test service',
    usageLimit: 10,
  },
]

const seedServices = async () => {
  const operations: any[] = []

  services.forEach((service) => {
    const operation = Service.upsert({
      ...service,
    })

    operations.push(operation)
  })

  await Promise.all(operations)
}

export default seedServices
