import { Service } from '../models'

const services = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Open ended chatting.',
    model: 'gpt-3.5-turbo',
    usageLimit: 50_000,
    resetCron: '0 0 1 */3 *', // Every three months
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
