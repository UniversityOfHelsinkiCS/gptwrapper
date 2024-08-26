import _ from 'lodash'
import { Op } from 'sequelize'
import { sequelize } from '../db/connection'
import { ChatInstance, Responsibility } from '../db/models'
import { ResponsibilityRow, SisuCourseWithRealization } from '../types'
import { safeBulkCreate } from './util'

const removeOldResponsibilities = async (
  responsibilitiesToInsert: ResponsibilityRow[]
) => {
  const chatInstanceIds = responsibilitiesToInsert.map(
    ({ chatInstanceId }) => chatInstanceId
  )

  await Responsibility.destroy({
    where: {
      chatInstanceId: {
        [Op.in]: chatInstanceIds,
      },
    },
  })
}

const getResponsibilityInfos = (
  courseRealisation: SisuCourseWithRealization
) => {
  const combinedResponsibilityInfos = courseRealisation.responsibilityInfos

  const uniqueResponsibilityInfos = _.uniqBy(
    combinedResponsibilityInfos,
    ({ personId, roleUrn }) => `${personId}${roleUrn}`
  )

  return uniqueResponsibilityInfos
}

export const upsertResponsibilities = async (
  courseRealizations: SisuCourseWithRealization[]
) => {
  const responsibilitiesFlat = courseRealizations.flatMap(
    (courseRealization) => {
      const responsibilityInfos = getResponsibilityInfos(courseRealization)
      return responsibilityInfos
        .filter(({ personId }) => personId)
        .map(({ personId }) => ({
          courseId: courseRealization.id,
          userId: personId,
        }))
    }
  )

  const responsibilitiesMap = _.groupBy(responsibilitiesFlat, 'courseId')

  const relatedCourseIds = responsibilitiesFlat.map(({ courseId }) => courseId)
  const relatedChatInstances = await ChatInstance.findAll({
    where: {
      courseId: {
        [Op.in]: relatedCourseIds,
      },
    },
    attributes: ['id', 'courseId'],
  })

  const responsibilitiesToInsert = relatedChatInstances.flatMap(
    ({ id, courseId }) =>
      responsibilitiesMap[courseId].map((responsibility) => ({
        chatInstanceId: id,
        userId: responsibility.userId,
      }))
  )

  const t = await sequelize.transaction()

  try {
    await removeOldResponsibilities(responsibilitiesToInsert)
    await safeBulkCreate({
      entityName: 'Responsibility',
      entities: responsibilitiesToInsert,
      bulkCreate: async (e, opts) => Responsibility.bulkCreate(e, opts),
      fallbackCreate: async (e, opts) => Responsibility.upsert(e, opts),
      bulkCreateOptions: {
        conflictAttributes: ['userId', 'chatInstanceId'],
        ignoreDuplicates: true,
      },
      fallbackCreateOptions: {
        conflictFields: ['user_id', 'chat_instance_id'],
        fields: ['user_id', 'chat_instance_id'],
        returning: false,
      }
    })

    await t.commit()
  } catch (err) {
    await t.rollback()
    throw err
  }
}
