import type { InferCreationAttributes } from 'sequelize'
import type { CourseUnit } from '../../types'
import { TEST_COURSES } from '../../../shared/testData'
import { ChatInstance } from '../models'

const chatInstances = Object.values(TEST_COURSES).map((course) => ({
  id: course.id,
  name: course.name,
  description: '',
  courseId: course.courseId,
  activityPeriod: course.activityPeriod,
  code: course.code,
  usageLimit: 'usageLimit' in course ? course.usageLimit : undefined,
  courseUnits: [
    {
      code: course.code,
      organisations: [
        {
          code: 'ote',
          id: 'ote',
          name: { en: 'OTE', fi: 'OTE', sv: 'OTE' },
        },
      ],
    },
  ] as CourseUnit[],
})) as unknown as InferCreationAttributes<ChatInstance>[]

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
