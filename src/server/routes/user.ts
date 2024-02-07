import express from 'express'

import { ChatRequest } from '../types'
import {
  checkIamAccess,
  checkCourseAccess,
  getOwnCourses,
} from '../services/access'
import { User } from '../db/models'
import { getUserStatus, getUsage } from '../services/usage'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = checkIamAccess(iamGroups)
  const usage = await getUsage(id)

  const enrolledCourses = await checkCourseAccess(id)
  const teacherCourses = await getOwnCourses(id, user.isAdmin)

  const courses = enrolledCourses.concat(teacherCourses)
  const hasCourseAccess = courses.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess)
    return res.status(401).send('Unauthorized')

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses
  await User.upsert(user)

  return res.send({
    ...user,
    usage,
    hasIamAccess: isAdmin || hasIamAccess,
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
