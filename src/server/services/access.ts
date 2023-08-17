import { Op } from 'sequelize'

import { ServiceAccessGroup, Service } from '../db/models'
import getEnrollments from '../util/importer'

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

  const hasAccess = enrolledCourseIds.some((id) => accessCourseIds.includes(id))

  return hasAccess
}
