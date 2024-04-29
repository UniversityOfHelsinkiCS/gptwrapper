import express from 'express'

import { ChatRequest } from '../types'
import logger from '../util/logger'
import {
  checkIamAccess,
  getEnrolledCourses,
  getOwnCourses,
} from '../chatInstances/access'
import { User } from '../db/models'
import { getUserStatus, getUsage } from '../chatInstances/usage'
import { DEFAULT_TOKEN_LIMIT } from '../../config'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = checkIamAccess(iamGroups)

  const enrolledCourses = await getEnrolledCourses(user)
  const teacherCourses = await getOwnCourses(user)

  const courses = enrolledCourses.concat(teacherCourses)
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

  return res.send({
    ...user,
    usage,
    hasIamAccess: isAdmin || hasIamAccess,
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
