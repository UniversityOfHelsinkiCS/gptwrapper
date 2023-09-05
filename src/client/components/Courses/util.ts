import { format } from 'date-fns'

import { ActivityPeriod } from '../../types'

export const formatDate = ({ startDate, endDate }: ActivityPeriod) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}
