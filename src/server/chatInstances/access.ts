import { accessIams } from '../util/config'
import { ChatInstance, Enrolment, Responsibility } from '../db/models'

export const checkIamAccess = (iamGroups: string[]) =>
  accessIams.some((iam) => iamGroups.includes(iam))

/**
 * Gets the chat instance ids of the courses the user is enrolled in
 */
export const getEnrolledCourses = async (userId: string) => {
  const enrollments = (await Enrolment.findAll({
    where: {
      userId,
    },
    include: [Enrolment.associations.chatInstance],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

  const courseIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  console.log('enrolled courseIds', courseIds)

  return courseIds
}

export const getOwnCourses = async (userId: string) => {
  const enrollments = (await Responsibility.findAll({
    where: {
      userId,
    },
    include: [Responsibility.associations.chatInstance],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

  const courseIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  console.log('teacher courseIds', courseIds)

  return courseIds
}
