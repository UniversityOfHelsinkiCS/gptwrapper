import { format } from 'date-fns'

import { ActivityPeriod, ChatInstanceUsage, Course } from '../../types'

export const formatDate = (activityPeriod?: ActivityPeriod) => {
  if (!activityPeriod) return ''

  const { startDate, endDate } = activityPeriod

  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}

export const sortCourses = (a: Course, b: Course) => {
  if (!a.activityPeriod || !b.activityPeriod) return 0

  const getStartTime = (course: Course) =>
    new Date(course.activityPeriod.startDate).getTime()

  return getStartTime(b) - getStartTime(a)
}

export const filterUsages = (
  maxTokenLimit: number,
  usages: ChatInstanceUsage[]
) => {
  const limit = maxTokenLimit * 0.9

  const closeToMaxTokenLimit = usages.filter(
    (usage) => usage.usageCount >= limit
  )

  return closeToMaxTokenLimit
}
