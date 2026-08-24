import type { ChatInstance } from '../../db/models'

export const chatIsActive = (chatInstance: ChatInstance) => {
  const start = new Date(chatInstance.activityPeriod.startDate)
  const end = new Date(chatInstance.activityPeriod.endDate)
  const today = new Date()

  const todayIsMoreOrEqualToStart = today >= start
  const todayIsLessOrEqualToEnd = today <= end
  const chatIsActivated = chatInstance.activated

  return todayIsMoreOrEqualToStart && todayIsLessOrEqualToEnd && chatIsActivated
}
