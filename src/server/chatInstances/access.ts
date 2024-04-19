/* eslint-disable no-restricted-syntax, no-await-in-loop */
import { Op } from 'sequelize'

import { accessIams } from '../util/config'
import { ChatInstance, Enrolment } from '../db/models'
import { getTeachers } from '../util/importer'

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

  const chatInstanceIds = enrollments.map(
    (enrolment) => enrolment.chatInstance.courseId
  ) as string[]

  console.log('chatInstanceIds', chatInstanceIds)

  return chatInstanceIds
}

export const getOwnCourses = async (userId: string, isAdmin = false) => {
  const courses = await ChatInstance.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
    attributes: ['courseId'],
  })

  const courseIds = courses.map(({ courseId }) => courseId) as string[]

  if (isAdmin) return courseIds

  const access: string[] = []
  for (const id of courseIds) {
    const teachers = await getTeachers(id)

    if (teachers.includes(userId)) {
      const course = courses.find(
        ({ courseId }) => courseId === id
      ) as ChatInstance

      access.push(course.courseId as string)
    }
  }

  return access
}
