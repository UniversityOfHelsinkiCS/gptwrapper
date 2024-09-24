import { TEST_COURSES } from '../../util/config'
import { ChatInstance } from '../models'

const chatInstances = [
  {
    id: TEST_COURSES.TEST_COURSE.id,
    name: { en: 'Test Course', sv: 'Test Course', fi: 'Test Course' },
    description: 'Course for testing purposes',
    courseId: TEST_COURSES.TEST_COURSE.id,
    activityPeriod: {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    },
  },
  {
    id: TEST_COURSES.EXAMPLE_COURSE.id,
    name: { en: 'Example Course', sv: 'Example Course', fi: 'Example Course' },
    description: '',
    courseId: TEST_COURSES.EXAMPLE_COURSE.id,
    activityPeriod: {
      startDate: '2024-01-01',
      endDate: '2024-08-31',
    },
  },
  {
    id: TEST_COURSES.OTE_SANDBOX.id,
    name: TEST_COURSES.OTE_SANDBOX.name,
    description: '',
    courseId: TEST_COURSES.OTE_SANDBOX.id,
    activityPeriod: TEST_COURSES.OTE_SANDBOX.activityPeriod,
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
