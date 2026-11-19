import { Tiktoken } from '@dqbd/tiktoken'

import _ from 'lodash'

import { DEFAULT_TOKEN_LIMIT, WEEKLY_BUDGET } from '../../../config'
import type { User as UserType } from '../../../shared/user'
import { ChatInstance, UserChatInstanceUsage, User, Enrolment, Responsibility } from '../../db/models'
import logger from '../../util/logger'
import { ApplicationError } from '../../util/ApplicationError'
import { readMessageContent, type Message } from '../../../shared/chat'
import { chatIsActive } from './activity'
import { getAccessLevel } from './access'
import { CourseUsage } from '@shared/types'
import type { BudgetBonus, UserBudget } from '@shared/usage'

export const getUsage = async (userId: string) => {
  const user = await User.findByPk(userId, {
    attributes: ['usage'],
  })

  if (!user) {
    throw ApplicationError.NotFound('User not found')
  }

  return user.usage
}

export const COURSE_TOKEN_BONUS = 100_000

/**
 * The courses (enrolled or responsible, each once) of each given user that are activated and inside their activity
 * period, by user id. Two queries in all, however many users: use this instead of a per-user lookup for many users.
 * Users without such courses are missing from the map.
 */
export const getActiveCourseMembershipsByUser = async (userIds: string[]): Promise<Map<string, ChatInstance[]>> => {
  const byUser = new Map<string, ChatInstance[]>()
  if (userIds.length === 0) return byUser

  const membershipQuery = {
    attributes: ['userId', 'chatInstanceId'],
    where: { userId: userIds },
    include: [
      {
        model: ChatInstance,
        as: 'chatInstance',
        attributes: ['id', 'courseId', 'name', 'activityPeriod', 'activated', 'budgetBonusPercent'],
        where: { activated: true },
        required: true,
      },
    ],
  }

  const [enrolments, responsibilities] = await Promise.all([
    Enrolment.findAll(membershipQuery) as Promise<(Enrolment & { chatInstance: ChatInstance })[]>,
    Responsibility.findAll(membershipQuery) as Promise<(Responsibility & { chatInstance: ChatInstance })[]>,
  ])

  for (const { userId, chatInstance } of [...enrolments, ...responsibilities]) {
    if (!chatIsActive(chatInstance)) continue
    const courses = byUser.get(userId) ?? []
    if (!courses.some((course) => course.id === chatInstance.id)) courses.push(chatInstance)
    byUser.set(userId, courses)
  }

  return byUser
}

/** The user's courses (enrolled or responsible, each once) that are activated and inside their activity period */
const getActiveCourseMemberships = async (user: UserType): Promise<ChatInstance[]> => (await getActiveCourseMembershipsByUser([user.id])).get(user.id) ?? []

/** Weekly budget in € given the user's active courses (from `getActiveCourseMembershipsByUser`) */
export const budgetOfCourses = (courses: ChatInstance[]): UserBudget => {
  const bonuses: BudgetBonus[] = courses
    .filter((chatInstance) => chatInstance.budgetBonusPercent != null)
    .map((chatInstance) => ({
      courseId: chatInstance.courseId ?? chatInstance.id,
      name: chatInstance.name,
      percent: chatInstance.budgetBonusPercent as number,
    }))

  const bonusPercent = _.sumBy(bonuses, (bonus) => bonus.percent)

  return { limit: WEEKLY_BUDGET * (1 + bonusPercent / 100), base: WEEKLY_BUDGET, bonuses }
}

/** Old weekly token limit given the user's active courses (from `getActiveCourseMembershipsByUser`) */
export const tokenLimitOfCourses = (user: Pick<UserType, 'isPowerUser'>, courses: ChatInstance[]): number => {
  const tierLimit = user.isPowerUser ? DEFAULT_TOKEN_LIMIT * 10 : DEFAULT_TOKEN_LIMIT

  return tierLimit + COURSE_TOKEN_BONUS * courses.length
}

/** The user's weekly budget in €: the base budget plus the bonuses of the user's active courses. Enforced under `USAGE_ENFORCEMENT=cost`. */
export const getUserBudget = async (user: UserType): Promise<UserBudget> => budgetOfCourses(await getActiveCourseMemberships(user))

export const getUserTokenLimit = async (user: UserType): Promise<number> => tokenLimitOfCourses(user, await getActiveCourseMemberships(user))

export const checkUsage = (user: UserType, usage: number, tokenLimit: number): boolean => {
  return user.isAdmin || usage < tokenLimit
}

export const getCourseTokenLimit = (chatInstance: ChatInstance): number => (chatInstance.activated ? chatInstance.usageLimit : DEFAULT_TOKEN_LIMIT)

export const checkCourseUsage = (user: UserType, chatInstance: ChatInstance, tokenLimit: number): boolean => {
  if (!chatInstance.currentUserUsage) {
    throw ApplicationError.InternalServerError('chatInstance.currentUserUsage undefined. This shouldnt happen!')
  }

  const tokenUsageExceeded = chatInstance.currentUserUsage.usageCount >= tokenLimit

  if (!user.isAdmin && tokenUsageExceeded) {
    logger.info('Usage limit reached')

    return false
  }

  return true
}

export const calculateUsage = (messages: Message[], encoding: Tiktoken): number => {
  let tokenCount = 0
  messages.forEach((message) => {
    const encoded = encoding.encode(readMessageContent(message))
    tokenCount += encoded.length
  })

  return tokenCount
}

export const incrementUsage = async (user: UserType, tokenCount: number) => {
  await User.increment('usage', {
    by: tokenCount,
    where: {
      id: user.id,
    },
  })
}

export const incrementCourseUsage = async (chatInstance: ChatInstance, tokenCount: number) => {
  if (!chatInstance.currentUserUsage) {
    throw ApplicationError.InternalServerError('chatInstance.currentUserUsage undefined. This shouldnt happen!')
  }
  await chatInstance.currentUserUsage.increment({ usageCount: tokenCount, totalUsageCount: tokenCount })
}

export const getUserStatus = async (user: UserType, courseId: string) => {
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    // getAccessLevel needs activityPeriod and activated to tell STUDENT from STUDENT_CLOSED.
    attributes: ['id', 'usageLimit', 'courseId', 'activityPeriod', 'activated'],
  })

  if (!chatInstance) throw ApplicationError.NotFound('Chat instance not found')

  // Any access level gets the usage, a closed course included.
  if (!(await getAccessLevel(user, chatInstance))) {
    logger.info('Unauthorized user on course', { userId: user.id, courseId })

    return {
      usage: 0,
      limit: 0,
    }
  }

  const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
    where: {
      chatInstanceId: chatInstance.id,
      userId: user.id,
    },
    defaults: {
      chatInstanceId: chatInstance.id,
      userId: user.id,
    },
    attributes: ['usageCount'],
  })

  return {
    usage: chatInstanceUsage?.usageCount ?? 0,
    limit: getCourseTokenLimit(chatInstance),
  }
}

export const getCourseUsages = async (user: UserType): Promise<CourseUsage[]> => {
  const chatInstanceUsages = await UserChatInstanceUsage.findAll({
    where: {
      userId: user.id,
    },
    include: [
      {
        model: ChatInstance,
        as: 'chatInstance',
        attributes: ['name', 'courseId', 'usageLimit', 'activated'],
      },
    ],
  })

  return chatInstanceUsages.map((ci) => ({
    courseId: ci.chatInstance!.courseId,
    name: ci.chatInstance!.name,
    usage: ci.usageCount ?? 0,
    limit: getCourseTokenLimit(ci.chatInstance!),
    activated: ci.chatInstance!.activated,
  }))
}
