import type { InferCreationAttributes } from 'sequelize'
import type { CourseUnit } from '../../types'
import { TEST_COURSES } from '../../../shared/testData'
import { ChatInstance } from '../models'

const chatInstances = [
  TEST_COURSES.TEST_COURSE,
  TEST_COURSES.EXAMPLE_COURSE,
  {
    id: TEST_COURSES.OTE_SANDBOX.id,
    name: TEST_COURSES.OTE_SANDBOX.name,
    description: '',
    courseId: TEST_COURSES.OTE_SANDBOX.id,
    activityPeriod: TEST_COURSES.OTE_SANDBOX.activityPeriod,
    courseUnits: [
      {
        code: TEST_COURSES.OTE_SANDBOX.code,
        organisations: [
          {
            code: 'ote',
            id: 'ote',
            name: { en: 'OTE', fi: 'OTE', sv: 'OTE' },
          },
        ],
      },
    ] as CourseUnit[],
  },
] as InferCreationAttributes<ChatInstance>[]

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
