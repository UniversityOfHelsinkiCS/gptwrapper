import { ChatInstance } from '../../db/models'

export const chatIsActive = (chatInstance: ChatInstance) => {
  const start = new Date(chatInstance.activityPeriod.startDate)
  const end = new Date(chatInstance.activityPeriod.endDate)
  const today = new Date()

  const todayIsMoreOrEqualToStart = today >= start
  const todayIsLessOrEqualToEnd = today <= end
  const usageLimitMoreThanZero = chatInstance.usageLimit > 0

  return todayIsMoreOrEqualToStart && todayIsLessOrEqualToEnd && usageLimitMoreThanZero
}
