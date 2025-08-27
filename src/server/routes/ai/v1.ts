import express from 'express'
import { DEFAULT_TOKEN_LIMIT, FREE_MODEL, inProduction } from '../../../config'
import { ChatInstance, Discussion, UserChatInstanceUsage } from '../../db/models'
import { calculateUsage, checkCourseUsage, checkUsage, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import type { APIError, RequestWithUser } from '../../types'
import { getCompletionEvents, streamCompletion } from '../../util/azure/client'
import logger from '../../util/logger'
import getEncoding from '../../util/tiktoken'
import { getMessageContext, getModelContextLimit } from '../../util/util'
import { ApplicationError } from '../../util/ApplicationError'
import { upload } from './multer'
import { parseFileAndAddToLastMessage } from './fileParsing'
import type { MessageType } from './types'

/**
 * @deprecated In favor of v3. Kept alive since v2 is unreliable and v3 is not yet mature.
 */
const router = express.Router()

router.post('/stream', upload.single('file'), async (r, res) => {
  const req = r as RequestWithUser
  const { options, courseId } = JSON.parse(req.body.data)
  const { model, userConsent } = options
  const { user } = req

  options.options = { temperature: options.modelTemperature }

  let course: ChatInstance | null = null

  if (courseId) {
    course = await ChatInstance.findOne({
      where: { courseId },
    })
    if (!course) {
      throw ApplicationError.NotFound('Course not found')
    }

    const [chatInstanceUsage] = await UserChatInstanceUsage.findOrCreate({
      where: {
        userId: user.id,
        chatInstanceId: course.id,
      },
    })
    course.currentUserUsage = chatInstanceUsage
  }

  const usageAllowed = (course ? checkCourseUsage(user, course) : model === FREE_MODEL) || checkUsage(user, model)

  if (!usageAllowed) {
    throw ApplicationError.Forbidden('Usage limit reached')
  }

  let optionsMessagesWithFile: MessageType[] | undefined = undefined

  try {
    if (req.file) {
      optionsMessagesWithFile = await parseFileAndAddToLastMessage(options.messages, req.file)
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    throw ApplicationError.BadRequest('Error parsing file')
  }

  options.messages = getMessageContext(optionsMessagesWithFile || options.messages)
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options.messages, encoding)
  const tokenUsagePercentage = Math.round((tokenCount / DEFAULT_TOKEN_LIMIT) * 100)

  if (model !== FREE_MODEL && tokenCount > 0.1 * DEFAULT_TOKEN_LIMIT && !userConsent) {
    res.status(201).json({
      tokenConsumtionWarning: true,
      message: `You are about to use ${tokenUsagePercentage}% of your monthly CurreChat usage`,
    })
    return
  }

  const contextLimit = getModelContextLimit(model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    throw ApplicationError.BadRequest('Maximum context reached')
  }

  const events = await getCompletionEvents(options)

  const isError = (events: any): events is APIError => 'error' in events
  if (isError(events)) {
    throw new ApplicationError('Error creating a response stream', 424)
  }

  res.setHeader('content-type', 'text/event-stream')

  const completion = await streamCompletion(events, options, encoding, res)

  tokenCount += completion.tokenCount

  let userToCharge = user
  if (inProduction && req.hijackedBy) {
    userToCharge = req.hijackedBy
  }

  if (course) {
    await incrementCourseUsage(course, tokenCount)
  } else if (model !== FREE_MODEL) {
    await incrementUsage(userToCharge, tokenCount)
  }

  const chatCompletionMeta = {
    tokenCount,
    model: options.model,
    user: user.username,
    courseId,
    course: course?.name?.fi,
    fileSize: req.file?.size,
  }

  logger.info(`Stream ended. Total tokens: ${tokenCount}`, chatCompletionMeta)

  res.locals.chatCompletionMeta = chatCompletionMeta

  const consentToSave = course?.saveDiscussions && options.saveConsent

  if (consentToSave) {
    const discussion = {
      userId: user.id,
      courseId,
      response: completion.response,
      metadata: options,
    }
    await Discussion.create(discussion)
  }

  encoding.free()

  res.end()
  return
})

export default router
