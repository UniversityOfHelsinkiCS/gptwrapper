import { TEST_COURSE_ID, EXAMPLE_COURSE_ID } from '../../util/config'
import { ChatInstance } from '../models'

const chatInstances = [
  {
    id: TEST_COURSE_ID,
    name: { en: 'Test Course', sv: 'Test Course', fi: 'Test Course' },
    description: 'Course for testing purposes',
    courseId: TEST_COURSE_ID,
    activityPeriod: {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    },
  },
  {
    id: EXAMPLE_COURSE_ID,
    name: { en: 'Example Course', sv: 'Example Course', fi: 'Example Course' },
    description: '',
    courseId: EXAMPLE_COURSE_ID,
    activityPeriod: {
      startDate: '2024-01-01',
      endDate: '2024-08-31',
    },
  },
]

const seedChatInstances = async () => {
  const operations: any[] = []
  chatInstances.forEach((chatInstance) => {
    const operation = ChatInstance.upsert({
      ...chatInstance,
    })

    operations.push(operation)
  })

  await Promise.all(operations)
}

export default seedChatInstances
