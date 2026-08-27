import { ChatStatus } from '@shared/types'
import type { ChatInstance } from '../../db/models'
import { ApplicationError } from 'src/server/util/ApplicationError'

export const chatIsActive = (chatInstance: ChatInstance) => {
  return getChatStatus(chatInstance) === 'ACTIVATED'
}

export const getChatStatus = (chatInstance: ChatInstance): ChatStatus => {
  const start = new Date(chatInstance.activityPeriod.startDate)
  const end = new Date(chatInstance.activityPeriod.endDate)
  const today = new Date()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw ApplicationError.InternalServerError('Invalid activity period', {
      extra: { chatInstanceId: chatInstance.id },
    })
  }

  if (end < today) {
    return 'EXPIRED'
  }

  if (start > today) {
    return 'NOT_STARTED'
  }

  if (!chatInstance.activated) {
    return 'NOT_ACTIVATED'
  }

  return 'ACTIVATED'
}
