import { format } from 'date-fns'

import { ActivityPeriod } from '../../types'

export const formatDate = (activityPeriod?: ActivityPeriod) => {
  if (!activityPeriod) return ''

  const { startDate, endDate } = activityPeriod

  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}
