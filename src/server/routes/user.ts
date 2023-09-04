import express from 'express'

import { ChatRequest } from '../types'
import { checkIamAccess } from '../services/access'
import { User } from '../db/models'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasIamAccess = await checkIamAccess(iamGroups)

  const hasCourseAccess = user.activeCourseIds.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess)
    return res.status(401).send('Unauthorized')

  await User.upsert(user)

  return res.send({
    ...user,
    hasIamAccess: isAdmin || hasIamAccess,
  })
})

export default userRouter
