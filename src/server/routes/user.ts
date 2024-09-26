import express from 'express'

import { ChatInstance, ChatRequest } from '../types'
import logger from '../util/logger'
import {
  getEnrolledCourseIds,
  getOwnCourses,
  getEnrolledCourses,
} from '../chatInstances/access'
import { User } from '../db/models'
import { getUserStatus, getUsage } from '../chatInstances/usage'
import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { getLastRestart } from '../util/lastRestart'
import { accessIams } from '../util/config'

export const checkIamAccess = (iamGroups: string[]) =>
  accessIams.some((iam) => iamGroups.includes(iam))

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request

  console.log('user', JSON.stringify(user))

  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = checkIamAccess(iamGroups)

  const enrolledCourseIds = await getEnrolledCourseIds(user)
  const teacherCourses = await getOwnCourses(user)

  const courses = enrolledCourseIds.concat(teacherCourses)
  const hasCourseAccess = courses.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess) {
    logger.info('Unauthorized user', { iamGroups })
    return res.status(401).send('Unauthorized')
  }

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses

  if (!request.hijackedBy) {
    await User.upsert(user)
  }

  const usage = await getUsage(id)

  const lastRestart = await getLastRestart()

  const enrolledCourses = await getEnrolledCourses(user)

  const isNowOrInFuture = ({ chatInstance }: { chatInstance: ChatInstance }) =>
    chatInstance.usageLimit > 0 &&
    new Date() <= new Date(chatInstance.activityPeriod.endDate)

  return res.send({
    ...user,
    usage,
    hasIamAccess: isAdmin || hasIamAccess,
    lastRestart,
    enrolledCourses: enrolledCourses
      .filter(isNowOrInFuture)
      .map((enrollment) => enrollment.chatInstance),
  })
})

userRouter.get('/status', async (req, res) => {
  const request = req as any as ChatRequest
  const { user } = request
  const { id } = user

  if (!id) return res.status(401).send('Unauthorized')

  const usage = await getUsage(id)
  const limit = user.isPowerUser
    ? 10 * DEFAULT_TOKEN_LIMIT
    : DEFAULT_TOKEN_LIMIT

  return res.send({
    usage,
    limit,
    // model,
    // models,
  })
})

userRouter.get('/status/:courseId', async (req, res) => {
  const { courseId } = req.params
  const request = req as any as ChatRequest
  const { user } = request
  const { id } = user

  if (!id) return res.status(401).send('Unauthorized')

  const { usage, limit, model, models } = await getUserStatus(user, courseId)

  return res.send({
    usage,
    limit,
    model,
    models,
  })
})

export default userRouter
