import { EXAMPLE_COURSE_ID, TEST_COURSE_ID, accessIams } from '../util/config'
import { ChatInstance, Enrolment, Responsibility } from '../db/models'
import { User } from '../types'

export const checkIamAccess = (iamGroups: string[]) =>
  accessIams.some((iam) => iamGroups.includes(iam))

/**
 * Gets the chat instance ids of the courses the user is enrolled in
 */
export const getEnrolledCourses = async (user: User) => {
  if (checkIamAccess(user.iamGroups)) {
    await Enrolment.upsert(
      {
        userId: user.id,
        chatInstanceId: EXAMPLE_COURSE_ID,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] }
    )
    await Enrolment.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSE_ID,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] }
    )
  }

  const enrollments = (await Enrolment.findAll({
    where: {
      userId: user.id,
    },
    include: [Enrolment.associations.chatInstance],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

  const courseIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  return courseIds
}

export const getOwnCourses = async (user: User) => {
  if (user.isAdmin) {
    await Responsibility.upsert(
      {
        userId: user.id,
        chatInstanceId: EXAMPLE_COURSE_ID,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] }
    )
    await Responsibility.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSE_ID,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] }
    )
  }

  const responsibilities = (await Responsibility.findAll({
    where: {
      userId: user.id,
    },
    include: [Responsibility.associations.chatInstance],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

  const courseIds = responsibilities.map(
    (responsibility) => responsibility.chatInstance.courseId
  ) as string[]

  return courseIds
}
