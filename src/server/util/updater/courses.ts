import { ChatInstance } from '../../db/models'
import {
  ActivityPeriod,
  SisuCourseUnit,
  SisuCourseWithRealization,
} from '../../types'
import { mangleData } from './mangleData'
import { upsertResponsibilities } from './responsibilities'
import { safeBulkCreate } from './util'

const validRealisationTypes = [
  'urn:code:course-unit-realisation-type:teaching-participation-lab',
  'urn:code:course-unit-realisation-type:teaching-participation-online',
  'urn:code:course-unit-realisation-type:teaching-participation-field-course',
  'urn:code:course-unit-realisation-type:teaching-participation-project',
  'urn:code:course-unit-realisation-type:teaching-participation-lectures',
  'urn:code:course-unit-realisation-type:teaching-participation-small-group',
  'urn:code:course-unit-realisation-type:teaching-participation-seminar',
  'urn:code:course-unit-realisation-type:teaching-participation-blended',
  'urn:code:course-unit-realisation-type:teaching-participation-contact',
  'urn:code:course-unit-realisation-type:teaching-participation-distance',
]

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
      name: courseUnit.name.en || courseUnit.name.fi || courseUnit.name.sv,
      courseId: course.id,
      activityPeriod: course.activityPeriod,
    }
  })

  await safeBulkCreate({
    entityName: 'ChatInstance',
    entities: chatInstances,
    bulkCreate: async (e, opts) => ChatInstance.bulkCreate(e, opts),
    fallbackCreate: async (e, opts) => ChatInstance.upsert(e, opts),
    options: {
      updateOnDuplicate: ['name'],
      conflictAttributes: ['courseId'],
    },
  })
}

const coursesHandler = async (
  courseRealizations: SisuCourseWithRealization[]
) => {
  const filteredCourseRealizations = courseRealizations.filter(
    (course) =>
      course.courseUnits.length &&
      validRealisationTypes.includes(course.courseUnitRealisationTypeUrn) &&
      course.flowState !== 'CANCELLED' &&
      course.flowState !== 'ARCHIVED'
  )

  await createChatInstance(filteredCourseRealizations)
  await upsertResponsibilities(filteredCourseRealizations)
}

// default 1000, set to 10 for example when debugging
const SPEED = 1000

export const updateCoursesAndResponsibilities = async () => {
  await mangleData('courses', SPEED, coursesHandler)
}
