import express from 'express'

import { ChatInstance, ChatRequest } from '../types'
import logger from '../util/logger'
import { getEnrolledCourseIds, getOwnCourses, getEnrolledCourses } from '../services/chatInstances/access'
import { User } from '../db/models'
import { getUserStatus, getUsage } from '../services/chatInstances/usage'
import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { getLastRestart } from '../util/lastRestart'
import { accessIams } from '../util/config'

export const checkIamAccess = (iamGroups: string[]) => accessIams.some((iam) => iamGroups.includes(iam))

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) {
    res.status(401).send('Unauthorized')
    return
  }

  const hasIamAccess = checkIamAccess(iamGroups)

  const enrolledCourseIds = await getEnrolledCourseIds(user)
  const teacherCourses = await getOwnCourses(user)

  const courses = enrolledCourseIds.concat(teacherCourses)
  const hasCourseAccess = courses.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess) {
    logger.info('Unauthorized user', { iamGroups })
    res.status(401).send('Unauthorized')
    return
  }

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses

  if (!request.hijackedBy) {
    await User.upsert(user)
  }

  const usage = await getUsage(id)

  const lastRestart = await getLastRestart()

  const enrolledCourses = await getEnrolledCourses(user)

  const isNowOrInFuture = ({ chatInstance }: { chatInstance: ChatInstance }) => chatInstance.usageLimit > 0 && new Date() <= new Date(chatInstance.activityPeriod.endDate)

  res.send({
    ...user,
    usage,
    hasIamAccess: isAdmin || hasIamAccess,
    lastRestart,
    enrolledCourses: enrolledCourses.filter(isNowOrInFuture).map((enrollment) => enrollment.chatInstance),
  })
  return
})

userRouter.get('/status', async (req, res) => {
  const request = req as any as ChatRequest
  const { user } = request
  const { id } = user

  if (!id) {
    res.status(401).send('Unauthorized')
    return
  }

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
  const request = req as any as ChatRequest
  const { user } = request
  const { id } = user

  if (!id) {
    res.status(401).send('Unauthorized')
    return
  }

  const { usage, limit, model, models } = await getUserStatus(user, courseId)

  res.send({
    usage,
    limit,
    model,
    models,
  })
  return
})

export default userRouter
