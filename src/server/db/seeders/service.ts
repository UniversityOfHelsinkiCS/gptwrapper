import { Service } from '../models'

const services = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Open ended chatting.',
    usageLimit: '50000', // Acually BigInt
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
