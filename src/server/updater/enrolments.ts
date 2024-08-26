import _ from 'lodash'
import { Op } from 'sequelize'
import { ChatInstance, Enrolment } from '../db/models'
import { mangleData } from './mangleData'
import { safeBulkCreate } from './util'

interface SisuEnrolment {
  courseId: string
  courseUnitRealisationId: string
  personId: string
}
const enrolmentsHandler = async (enrolments: SisuEnrolment[]) => {
  const enrolmentsMap = _.groupBy(enrolments, 'courseUnitRealisationId')

  const relatedCourseIds = enrolments.map(
    ({ courseUnitRealisationId }) => courseUnitRealisationId
  )
  const relatedChatInstances = await ChatInstance.findAll({
    where: {
      courseId: {
        [Op.in]: relatedCourseIds,
      },
    },
    attributes: ['id', 'courseId'],
  })

  const toInsert = relatedChatInstances.flatMap((chatInstance) =>
    (enrolmentsMap[chatInstance.courseId] || []).map((enrolment) => ({
      chatInstanceId: chatInstance.id,
      userId: enrolment.personId,
    }))
  )

  await safeBulkCreate({
    entityName: 'Enrolment',
    entities: toInsert,
    bulkCreate: async (e, opt) => Enrolment.bulkCreate(e, opt),
    fallbackCreate: async (e, opt) => Enrolment.upsert(e, opt),
    bulkCreateOptions: {
      conflictAttributes: ['userId', 'chatInstanceId'],
      ignoreDuplicates: true,
    },
    fallbackCreateOptions: {
      conflictFields: ['user_id', 'chat_instanceId'],
      fields: ['user_id', 'chat_instance_id'],
      returning: false,
    }
  })
}

export const fetchEnrolments = async () => {
  const getDataSince = new Date()
  getDataSince.setFullYear(getDataSince.getFullYear() - 1)

  await mangleData('enrolments-new', 1_000, enrolmentsHandler, getDataSince)
}
