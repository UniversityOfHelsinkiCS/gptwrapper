import { TEST_COURSE_ID } from '../../util/config'
import { Service } from '../models'

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
    id: TEST_COURSE_ID,
    name: 'Test Course',
    description: 'Course for testing purposes',
    courseId: TEST_COURSE_ID,
    activityPeriod: {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    },
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
