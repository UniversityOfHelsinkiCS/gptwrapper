import { EXAMPLE_COURSE_ID, TEST_COURSE_ID, accessIams } from '../util/config'
import { ChatInstance, Enrolment, Responsibility } from '../db/models'
import { User } from '../types'

export const checkIamAccess = (iamGroups: string[]) =>
  accessIams.some((iam) => iamGroups.includes(iam))

/**
 * Gets the chat instance ids of the courses the user is enrolled in
 */
export const getEnrolledCourses = async (user: User) => {
  const enrollments = (await Enrolment.findAll({
    where: {
      userId: user.id,
    },
    include: [Enrolment.associations.chatInstance],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

  const courseIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  if (checkIamAccess(user.iamGroups)) {
    courseIds.push(EXAMPLE_COURSE_ID)
    courseIds.push(TEST_COURSE_ID)
  }

  console.log('enrolled courseIds', courseIds)

  return courseIds
}

export const getOwnCourses = async (user: User) => {
  const enrollments = (await Responsibility.findAll({
    where: {
      userId: user.id,
    },
    include: [Responsibility.associations.chatInstance],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

  const courseIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  if (user.isAdmin) {
    courseIds.push(EXAMPLE_COURSE_ID)
    courseIds.push(TEST_COURSE_ID)
  }

  console.log('teacher courseIds', courseIds)

  return courseIds
}
