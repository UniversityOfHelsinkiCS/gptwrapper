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

/** The user's courses (enrolled or responsible, each once) that are activated and inside their activity period */
const getActiveCourseMemberships = async (user: UserType): Promise<ChatInstance[]> => {
  const membershipQuery = {
    attributes: ['chatInstanceId'],
    where: { userId: user.id },
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

  const activeChatInstances = [...enrolments, ...responsibilities].map((membership) => membership.chatInstance).filter(chatIsActive)

  return _.uniqBy(activeChatInstances, (chatInstance) => chatInstance.id)
}

const countActiveCourseMemberships = async (user: UserType): Promise<number> => (await getActiveCourseMemberships(user)).length

/** The user's weekly budget in €: the base budget plus the bonuses of the user's active courses. Not enforced yet. */
export const getUserBudget = async (user: UserType): Promise<UserBudget> => {
  const courses = await getActiveCourseMemberships(user)

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

export const getUserTokenLimit = async (user: UserType): Promise<number> => {
  const tierLimit = user.isPowerUser ? DEFAULT_TOKEN_LIMIT * 10 : DEFAULT_TOKEN_LIMIT

  const activeCourseCount = await countActiveCourseMemberships(user)

  return tierLimit + COURSE_TOKEN_BONUS * activeCourseCount
}

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
