import { format } from 'date-fns'

import { ActivityPeriod, ChatInstanceUsage, Course } from '../../types'
import { CoursesViewCourse } from '../../hooks/useUserCourses'

import curTypes from '../../locales/curTypes.json'

export const getCurTypeLabel = (type: string, language: string) => curTypes[type] && curTypes[type].name[language]

export const formatDate = (activityPeriod?: ActivityPeriod) => {
  if (!activityPeriod) return ''

  const { startDate, endDate } = activityPeriod

  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}

export const formatDateTime = (date: string) => `${format(new Date(date), 'dd.MM.yyyy hh:mm:ss')}`

export const filterUsages = (maxTokenLimit: number, usages: ChatInstanceUsage[]) => {
  const limit = maxTokenLimit * 0.9

  const closeToMaxTokenLimit = usages.filter((usage) => usage.usageCount >= limit)

  return closeToMaxTokenLimit
}

export const getGroupedCourses = (courses: CoursesViewCourse[]) => {
  const normalizedCourseUnits = courses ?? []

  const curreEnabled = normalizedCourseUnits.filter((course) => course.isActive)

  const ended = normalizedCourseUnits.filter((course) => course.isExpired)

  return {
    curreEnabled,
    ended,
  }
}
