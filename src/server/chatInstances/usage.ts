import { Tiktoken } from '@dqbd/tiktoken'

import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { tikeIam } from '../util/config'
import { User as UserType, StreamingOptions } from '../types'
import { ChatInstance, UserServiceUsage, User } from '../db/models'
import { getCourseModel, getAllowedModels } from '../util/util'
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
  if (model === 'gpt-3.5-turbo') return true

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

  const [chatInstanceUsage] = await UserServiceUsage.findOrCreate({
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
    const encoded = encoding.encode(message.content || '')
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

  const chatInstanceUsage = await UserServiceUsage.findOne({
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
    attributes: ['id', 'usageLimit', 'courseId'],
  })

  const chatInstanceUsage = await UserServiceUsage.findOne({
    where: {
      chatInstanceId: chatInstance.id,
      userId: user.id,
    },
    attributes: ['usageCount'],
  })

  const model = await getCourseModel(chatInstance.courseId)
  const models = getAllowedModels(model)

  return {
    usage: chatInstanceUsage?.usageCount ?? 0,
    limit: chatInstance?.usageLimit ?? 0,
    model,
    models,
    isTike,
  }
}
