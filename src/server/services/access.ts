/* eslint-disable no-restricted-syntax, no-await-in-loop */
import { Op } from 'sequelize'

import { ServiceAccessGroup, Service } from '../db/models'
import { getEnrollments, getTeachers } from '../util/importer'

export const checkIamAccess = async (iamGroups: string[]) => {
  const accessGroups = await ServiceAccessGroup.findAll({
    where: {
      iamGroup: {
        [Op.in]: iamGroups,
      },
    },
    attributes: ['model'],
  })

  return accessGroups.length > 0
}

export const checkCourseAccess = async (userId: string) => {
  const coursesWithAccess = await Service.findAll({
    where: {
      courseId: {
        [Op.not]: null,
      },
    },
    attributes: ['courseId'],
  })

  const accessCourseIds = coursesWithAccess.map(
    ({ courseId }) => courseId
  ) as string[]

  const enrollments = await getEnrollments(userId)
  const enrolledCourseIds = enrollments.map(
    ({ courseUnitRealisation }) => courseUnitRealisation.id
  )

  const courseIds = enrolledCourseIds.filter((id) =>
    accessCourseIds.includes(id)
  )

  return courseIds
}

export const getOwnCourses = async (userId: string, isAdmin = false) => {
  const courses = await Service.findAll({
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
      const course = courses.find(({ courseId }) => courseId === id) as Service

      access.push(course.courseId as string)
    }
  }

  return access
}
