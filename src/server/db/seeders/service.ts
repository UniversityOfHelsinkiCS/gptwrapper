import { Service } from '../models'
import { Message } from '../../types'

const services = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Default service used with IAM access',
    model: 'gpt-3.5-turbo',
    usageLimit: 50_000,
    resetCron: '0 0 1 */3 *', // Every three months
  },
  {
    id: 'test',
    name: 'Test',
    description: 'Test service.',
    model: 'gpt-3.5-turbo',
    usageLimit: 50_000,
    resetCron: '0 0 1 */3 *', // Every three months
    courseId: 'otm-f430e779-c133-42d9-a0a8-23f92c9cc69f',
    prompt: [
      { role: 'system', content: 'This is a test' },
      { role: 'user', content: 'Say this is a test' },
      { role: 'assistant', content: 'This is a test' },
    ] as Message[],
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
