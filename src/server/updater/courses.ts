import { Locales } from '@shared/types'

import { ChatInstance } from '../db/models'
import { ActivityPeriod, SisuCourseUnit, SisuCourseWithRealization } from '../types'
import { mangleData } from './mangleData'
import { upsertResponsibilities } from './responsibilities'
import { safeBulkCreate } from './util'

type Lang = keyof Locales

// Find the newest course unit that has started before the course realisation
const getCourseUnit = (courseUnits: SisuCourseUnit[], activityPeriod: ActivityPeriod) => {
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

const courseUnitsOf = ({ courseUnits }: any) => {
  const relevantFields = courseUnits.map((unit) => ({
    code: unit.code,
    organisations: unit.organisations,
  }))

  // take only unique values
  return relevantFields.reduce((acc, curr) => {
    const found = acc.find((item) => item.code === curr.code)
    if (!found) {
      acc.push(curr)
    }
    return acc
  }, [])
}

const getLanguageValue = (values: Locales | null | undefined, preferred: Lang): string | null => {
  if (!values) {
    return null
  }

  const possibleLangs: Lang[] = ['fi', 'en', 'sv']

  if (values[preferred]) return values[preferred]

  for (const lang of possibleLangs) {
    if (values[lang]) return values[lang]
  }

  return null
}

// Documents created in sisu have id format of `otm-{UUID}`
const hasSisuLikeNamingConvention = (id: string): boolean => id.startsWith('otm-') || id.startsWith('hy-cur-aili-')

const isOptimeOriginatingId = (id: string): boolean => id.startsWith('hy-opt-cur-')

const courseNameWithCourseType = (name: Locales | string | null, type: Locales | string | null, lang: Lang): string | null => {
  const nameTranslated = typeof name === 'string' ? name : getLanguageValue(name, lang)
  const typeTranslated = typeof type === 'string' ? type : getLanguageValue(type, lang)

  if (!nameTranslated) {
    return typeTranslated
  }
  if (!typeTranslated) {
    return nameTranslated
  }
  return `${nameTranslated} | ${typeTranslated}`
}

/**
 * Translate and format course name.
 *
 * Realisations created in Sisu (id format "otm-<nnn>") contain course type in "name" field and descriptive name in "nameSpecifier" field.
 * Realisations created in Optime (id format "hy-opt-cur-<nnn>") or Oodi (id format "hy-CUR-<nnn>") are opposite of this.
 *
 * Returns course name as "Descriptive name, Course type" for sisu native and oodi courses and courses descriptive name for
 * realisations created in Optime.
 */
const formatCourseName = (id: string, name: Locales, nameSpecifier: Locales, lang: Lang): string | null => {
  if (hasSisuLikeNamingConvention(id)) {
    return courseNameWithCourseType(nameSpecifier, name, lang)
  }
  if (isOptimeOriginatingId(id)) {
    return courseNameWithCourseType(name, null, lang)
  }
  return courseNameWithCourseType(name, nameSpecifier, lang)
}
const createChatInstance = async (courseRealisations: SisuCourseWithRealization[]) => {
  const chatInstances = courseRealisations.map((course) => {
    const finnishFallbackName = formatCourseName(course.id, course.name, course.nameSpecifier, 'fi')

    return {
      name: {
        fi: finnishFallbackName,
        en: formatCourseName(course.id, course.name, course.nameSpecifier, 'en') || finnishFallbackName,
        sv: formatCourseName(course.id, course.name, course.nameSpecifier, 'sv') || finnishFallbackName,
      },
      courseId: course.id,
      activityPeriod: course.activityPeriod,
      courseActivityPeriod: course.activityPeriod,
      courseUnitRealisationTypeUrn: course.courseUnitRealisationTypeUrn,
      courseUnits: courseUnitsOf(course),
    }
  })

  await safeBulkCreate({
    entityName: 'ChatInstance',
    entities: chatInstances,
    bulkCreate: async (e, opts) => ChatInstance.bulkCreate(e, opts),
    fallbackCreate: async (e, opts) => ChatInstance.upsert(e, opts),
    bulkCreateOptions: {
      updateOnDuplicate: ['name', 'courseUnitRealisationTypeUrn', 'courseUnits', 'courseActivityPeriod'],
      conflictAttributes: ['courseId'],
    },
    fallbackCreateOptions: {
      fields: ['courseId'],
    },
  })
}

const coursesHandler = async (courseRealizations: SisuCourseWithRealization[]) => {
  const filteredCourseRealizations = courseRealizations.filter(
    (course) => course.courseUnits.length && course.flowState !== 'CANCELLED' && course.flowState !== 'ARCHIVED',
  )

  await createChatInstance(filteredCourseRealizations)
  await upsertResponsibilities(filteredCourseRealizations)
}

// default 1000, set to 10 for example when debugging
const SPEED = 1000

export const fetchCoursesAndResponsibilities = async () => {
  await mangleData('courses', SPEED, coursesHandler)
}
