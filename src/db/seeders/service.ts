import { Service } from '../models'
import { parseServices } from '../../util/parser'

const seedServices = async () => {
  const services = parseServices()

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
