import { Tiktoken } from '@dqbd/tiktoken'

import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, ValidModelName } from '../../../config'
import type { User as UserType } from '../../../shared/user'
import { ChatInstance, UserChatInstanceUsage, User, Enrolment, Responsibility } from '../../db/models'
import logger from '../../util/logger'
import { ApplicationError } from '../../util/ApplicationError'
import type { Message } from '../../../shared/chat'
import { checkIamAccess } from '../../util/iams'
import { chatIsActive } from './activity'
import { CourseUsage } from '@shared/types'

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
const countActiveCourseMemberships = async (user: UserType): Promise<number> => {
  const membershipQuery = {
    attributes: ['chatInstanceId'],
    where: { userId: user.id },
    include: [
      {
        model: ChatInstance,
        as: 'chatInstance',
        attributes: ['id', 'activityPeriod', 'activated'],
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

  return new Set(activeChatInstances.map((chatInstance) => chatInstance.id)).size
}

export const getUserTokenLimit = async (user: UserType): Promise<number> => {
  const hasFullAccess = user.isAdmin || checkIamAccess(user.iamGroups)
  const baseLimit = hasFullAccess ? DEFAULT_TOKEN_LIMIT : DEFAULT_TOKEN_LIMIT / 2
  const tierLimit = user.isPowerUser ? baseLimit * 10 : baseLimit

  const activeCourseCount = await countActiveCourseMemberships(user)

  return tierLimit + COURSE_TOKEN_BONUS * activeCourseCount
}

export const checkUsage = (user: UserType, model: ValidModelName, tokenLimit: number): boolean => {
  if (model === FREE_MODEL) return true
  return user.isAdmin || (user.usage ?? 0) <= tokenLimit
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
    let content: string = ''
    if (typeof message.content === 'string') {
      content = message.content
    }
    const encoded = encoding.encode(content)
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
    attributes: ['id', 'usageLimit', 'courseId'],
  })

  if (!chatInstance) throw ApplicationError.NotFound('Chat instance not found')

  // Get enrollment
  const enrollment = await Enrolment.findOne({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  // Get responsibility
  const responsibility = await Responsibility.findOne({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  // If user has neither and is not admin, return unauthorized
  if (!enrollment && !responsibility && !user.isAdmin) {
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
    limit: chatInstance?.usageLimit ?? 0,
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
    limit: ci.chatInstance!.usageLimit ?? 0,
    activated: ci.chatInstance!.activated,
  }))
}
