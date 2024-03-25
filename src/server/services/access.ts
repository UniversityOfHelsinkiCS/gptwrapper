/* eslint-disable no-restricted-syntax, no-await-in-loop */
import { Op } from 'sequelize'

import { accessIams, employeeIam, EXAMPLE_COURSE_ID } from '../util/config'
import { ChatInstance } from '../db/models'
import { getEnrollments, getTeachers } from '../util/importer'

export const checkIamAccess = (iamGroups: string[]) =>
  accessIams.some((iam) => iamGroups.includes(iam))

export const checkCourseAccess = async (
  userId: string,
  iamGroups: string[]
) => {
  const activeCourses = await ChatInstance.findAll({
    where: {
      courseId: {
        [Op.not]: null,
      },
      activityPeriod: {
        startDate: {
          [Op.lte]: new Date(),
        },
        endDate: {
          [Op.gte]: new Date(),
        },
      },
    },
    attributes: ['courseId'],
  })

  const activeCourseIds = activeCourses.map(
    ({ courseId }) => courseId
  ) as string[]

  const enrollments = await getEnrollments(userId)

  const enrolledCourseIds = enrollments.map(
    ({ courseUnitRealisation }) => courseUnitRealisation.id
  )

  const courseIds = enrolledCourseIds.filter((id) =>
    activeCourseIds.includes(id)
  )

  if (iamGroups.includes(employeeIam)) courseIds.push(EXAMPLE_COURSE_ID)

  return courseIds
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
