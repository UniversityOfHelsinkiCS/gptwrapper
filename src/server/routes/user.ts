import express from 'express'

import type { ChatInstance, RequestWithUser } from '../types'
import logger from '../util/logger'
import { getEnrolledCourseIds, getOwnCourses, getEnrolledCourses } from '../services/chatInstances/access'
import { User } from '../db/models'
import { getUserStatus, getUsage } from '../services/chatInstances/usage'
import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { getLastRestart } from '../util/lastRestart'
import { accessIams } from '../util/config'
import { ApplicationError } from '../util/ApplicationError'
import { UserPreferencesSchema } from '../../shared/user'

export const checkIamAccess = (iamGroups: string[]) => accessIams.some((iam) => iamGroups.includes(iam))

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  const hasIamAccess = checkIamAccess(iamGroups)

  const enrolledCourseIds = await getEnrolledCourseIds(user)
  const teacherCourses = await getOwnCourses(user)

  const courses = enrolledCourseIds.concat(teacherCourses)
  const hasCourseAccess = courses.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess) {
    logger.info('Unauthorized user', { iamGroups })
    throw ApplicationError.Unauthorized('Unauthorized')
  }

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses

  let dbUser: User | null = null

  // When acual user logs in, update the users info.
  if (!request.hijackedBy) {
    user.lastLoggedInAt = new Date()
    ;[dbUser] = await User.upsert(user)
  } else {
    dbUser = await User.findByPk(id)

    if (!dbUser) {
      // <- this should not happen. Only if hijacking a nonexisting user somehow.
      throw ApplicationError.NotFound('User to hijack not found')
    }
  }

  const usage = await getUsage(id)

  const lastRestart = await getLastRestart()

  const enrolledCourses = await getEnrolledCourses(user)

  const termsAccepted = await User.findByPk(id, { attributes: ['termsAcceptedAt'] })

  const isNowOrInFuture = ({ chatInstance }: { chatInstance: ChatInstance }) =>
    chatInstance.usageLimit > 0 && new Date() <= new Date(chatInstance.activityPeriod.endDate)

  res.send({
    ...dbUser.toJSON(),
    ...user,
    usage,
    hasIamAccess: isAdmin || hasIamAccess,
    lastRestart,
    enrolledCourses: enrolledCourses.filter(isNowOrInFuture).map((enrollment) => enrollment.chatInstance),
    termsAcceptedAt: termsAccepted?.termsAcceptedAt,
  })
  return
})

userRouter.get('/status', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request
  const { id } = user

  const usage = await getUsage(id)
  const limit = user.isPowerUser ? 10 * DEFAULT_TOKEN_LIMIT : DEFAULT_TOKEN_LIMIT

  res.send({
    usage,
    limit,
    // model,
    // models,
  })
  return
})

userRouter.get('/status/:courseId', async (req, res) => {
  const { courseId } = req.params
  const request = req as any as RequestWithUser
  const { user } = request

  const { usage, limit, model, models } = await getUserStatus(user, courseId)

  res.send({
    usage,
    limit,
    model,
    models,
  })
  return
})

userRouter.post('/accept-terms', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request
  const { id } = user

  await User.update({ termsAcceptedAt: new Date() }, { where: { id } })

  res.status(200).send()
})

userRouter.put('/preferences', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request
  const { id } = user

  const preferences = UserPreferencesSchema.parse(req.body)

  const newPreferences = {
    ...(user.preferences ?? {}),
    ...preferences,
  }

  await User.update({ preferences: newPreferences }, { where: { id } })

  res.status(200).send(preferences)
})

export default userRouter
