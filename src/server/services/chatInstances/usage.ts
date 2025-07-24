import { Tiktoken } from '@dqbd/tiktoken'

import { DEFAULT_TOKEN_LIMIT, FREE_MODEL } from '../../../config'
import { tikeIam } from '../../util/config'
import type { User as UserType, StreamingOptions } from '../../types'
import { ChatInstance, UserChatInstanceUsage, User, Enrolment, Responsibility } from '../../db/models'
import { getAllowedModels } from '../../util/util'
import logger from '../../util/logger'
import { ApplicationError } from '../../util/ApplicationError'

export const getUsage = async (userId: string) => {
  const user = await User.findByPk(userId, {
    attributes: ['usage'],
  })

  if (!user) {
    throw ApplicationError.NotFound('User not found')
  }

  return user.usage
}

export const checkUsage = async (user: UserType, model: string): Promise<boolean> => {
  if (model === FREE_MODEL) return true

  // 10x token limit for power users
  const tokenLimit = user.isPowerUser ? DEFAULT_TOKEN_LIMIT * 10 : DEFAULT_TOKEN_LIMIT

  return user.isAdmin || (user.usage ?? 0) <= tokenLimit
}

export const checkCourseUsage = async (user: UserType, chatInstance: ChatInstance): Promise<boolean> => {
  const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  if (!user.isAdmin && chatInstanceUsage.usageCount >= chatInstance.usageLimit) {
    logger.info('Usage limit reached')

    return false
  }

  return true
}

interface UsageOptions {
  messages: StreamingOptions['messages']
}
export const calculateUsage = (options: UsageOptions, encoding: Tiktoken): number => {
  const { messages } = options

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

export const incrementCourseUsage = async (user: UserType, chatInstance: ChatInstance, tokenCount: number) => {
  const chatInstanceUsage = await UserChatInstanceUsage.findOne({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  if (!chatInstanceUsage) throw new Error('User chatInstance usage not found')

  chatInstanceUsage.usageCount += tokenCount

  await chatInstanceUsage.save()
}

export const getUserStatus = async (user: UserType, courseId: string) => {
  const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['id', 'usageLimit', 'courseId', 'model'],
  })

  if (!chatInstance) throw new Error('Chat instance not found')

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
      model: '',
      models: [],
      isTike,
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

  const model = chatInstance.model ?? ''

  const models = getAllowedModels(model)

  return {
    usage: chatInstanceUsage?.usageCount ?? 0,
    limit: chatInstance?.usageLimit ?? 0,
    model,
    models,
    isTike,
  }
}
