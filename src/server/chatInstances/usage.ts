import { Tiktoken } from '@dqbd/tiktoken'

import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { tikeIam } from '../util/config'
import { User as UserType, StreamingOptions } from '../types'
import {
  ChatInstance,
  UserChatInstanceUsage,
  User,
  Enrolment,
  Responsibility,
} from '../db/models'
import { getAllowedModels } from '../util/util'
import logger from '../util/logger'

export const getUsage = async (userId: string) => {
  const { usage } = await User.findByPk(userId, {
    attributes: ['usage'],
  })

  return usage
}

export const checkUsage = async (
  { id, isPowerUser, isAdmin }: UserType,
  model: string
): Promise<boolean> => {
  if (model === 'gpt-4o-mini') return true

  const usage = await getUsage(id)

  // 10x token limit for power users
  const tokenLimit = isPowerUser
    ? DEFAULT_TOKEN_LIMIT * 10
    : DEFAULT_TOKEN_LIMIT

  return isAdmin || usage <= tokenLimit
}

export const checkCourseUsage = async (
  user: UserType,
  courseId: string
): Promise<boolean> => {
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
  })

  const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  if (
    !user.isAdmin &&
    chatInstanceUsage.usageCount >= chatInstance.usageLimit
  ) {
    logger.info('Usage limit reached')

    return false
  }

  return true
}

export const calculateUsage = (
  options: StreamingOptions,
  encoding: Tiktoken
): number => {
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

export const incrementCourseUsage = async (
  user: UserType,
  courseId: string,
  tokenCount: number
) => {
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['id'],
  })

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
