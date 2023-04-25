import { Service } from '../models'

const services = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Open ended chatting.',
    usageLimit: 50_000,
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
