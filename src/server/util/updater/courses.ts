import { ChatInstance } from '../../db/models'
import { SisuCourseWithRealization } from '../../types'
import { mangleData } from './mangleData'
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

const createChatInstance = async (
  courseRealisations: SisuCourseWithRealization[]
) => {
  const chatInstances = courseRealisations.map((course) => ({
    name: course.name.en || course.name.fi || course.name.sv,
    courseId: course.id,
    activityPeriod: course.activityPeriod,
  }))

  await safeBulkCreate({
    entityName: 'ChatInstance',
    entities: chatInstances,
    bulkCreate: async (e, opts) => ChatInstance.bulkCreate(e, opts),
    fallbackCreate: async (e, opts) => ChatInstance.upsert(e, opts),
    options: {
      updateOnDuplicate: ['name', 'courseId'],
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
}

// default 1000, set to 10 for example when debugging
const SPEED = 1000

export const updateCourses = async () => {
  await mangleData('courses', SPEED, coursesHandler)
}
