import { inProduction } from '../../../config'
import { Service } from '../models'

const services = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Open ended chatting.',
    usageLimit: inProduction ? 100_000 : Number.MAX_SAFE_INTEGER,
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
