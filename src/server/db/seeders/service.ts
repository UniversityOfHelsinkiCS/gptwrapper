import { TEST_COURSE_ID, EXAMPLE_COURSE_ID } from '../../util/config'
import { Service } from '../models'

const services = [
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
  {
    id: EXAMPLE_COURSE_ID,
    name: 'Example Course',
    description: '',
    courseId: EXAMPLE_COURSE_ID,
    activityPeriod: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
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
