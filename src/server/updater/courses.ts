import { ChatInstance } from '../db/models'
import {
  ActivityPeriod,
  SisuCourseUnit,
  SisuCourseWithRealization,
} from '../types'
import { mangleData } from './mangleData'
import { upsertResponsibilities } from './responsibilities'
import { safeBulkCreate } from './util'

// Find the newest course unit that has started before the course realisation
const getCourseUnit = (
  courseUnits: SisuCourseUnit[],
  activityPeriod: ActivityPeriod
) => {
  let courseUnit = courseUnits[0] // old default

  const { startDate: realisationStartDate } = activityPeriod

  courseUnits.sort((a, b) => {
    const { startDate: aStartDate } = a.validityPeriod
    const { startDate: bStartDate } = b.validityPeriod

    if (!aStartDate || !bStartDate) return 0

    return Date.parse(aStartDate) - Date.parse(bStartDate)
  })

  courseUnit =
    courseUnits.find(({ validityPeriod }) => {
      const { startDate } = validityPeriod

      if (!startDate) return false

      return Date.parse(realisationStartDate) > Date.parse(startDate)
    }) ?? courseUnit

  return courseUnit
}

const createChatInstance = async (
  courseRealisations: SisuCourseWithRealization[]
) => {
  const chatInstances = courseRealisations.map((course) => {
    const courseUnit = getCourseUnit(course.courseUnits, course.activityPeriod)

    return {
      name: {
        fi: courseUnit.name.fi,
        en: courseUnit.name.en || courseUnit.name.fi,
        sv: courseUnit.name.sv || courseUnit.name.fi,
      },
      courseId: course.id,
      activityPeriod: course.activityPeriod,
    }
  })

  await safeBulkCreate({
    entityName: 'ChatInstance',
    entities: chatInstances,
    bulkCreate: async (e, opts) => ChatInstance.bulkCreate(e, opts),
    fallbackCreate: async (e, opts) => ChatInstance.upsert(e, opts),
    bulkCreateOptions: {
      updateOnDuplicate: ['name'],
      conflictAttributes: ['courseId'],
    },
    fallbackCreateOptions: {
      fields: ['courseId']
    }
  })
}

const coursesHandler = async (
  courseRealizations: SisuCourseWithRealization[]
) => {
  const filteredCourseRealizations = courseRealizations.filter(
    (course) =>
      course.courseUnits.length &&
      course.flowState !== 'CANCELLED' &&
      course.flowState !== 'ARCHIVED'
  )

  await createChatInstance(filteredCourseRealizations)
  await upsertResponsibilities(filteredCourseRealizations)
}

// default 1000, set to 10 for example when debugging
const SPEED = 1000

export const fetchCoursesAndResponsibilities = async () => {
  await mangleData('courses', SPEED, coursesHandler)
}
