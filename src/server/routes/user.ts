import express from 'express'

import { ChatRequest } from '../types'
import { checkIamAccess, checkCourseAccess } from '../services/access'
import { User } from '../db/models'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = await checkIamAccess(iamGroups)
  if (isAdmin || hasIamAccess) return res.send(user)

  const userCourses = await checkCourseAccess(id)
  if (userCourses.length === 0) return res.status(401).send('Unauthorized')

  user.activeCourseIds = userCourses
  await User.upsert(user)

  return res.send(user)
})

export default userRouter
