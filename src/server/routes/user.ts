import express from 'express'

import { ChatRequest } from '../types'
import { checkIamAccess, checkCourseAccess } from '../services/access'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = await checkIamAccess(iamGroups)
  if (isAdmin || hasIamAccess) return res.send(user)

  const hasCourseAccess = await checkCourseAccess(id)
  if (hasCourseAccess) return res.send(user)

  return res.status(401).send('Unauthorized')
})

export default userRouter
