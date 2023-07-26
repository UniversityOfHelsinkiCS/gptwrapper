import express from 'express'

import { ChatRequest } from '../types'
import checkAccess from '../services/access'

const userRouter = express.Router()

userRouter.get('/login', async (req, res) => {
  const request = req as ChatRequest
  const { user } = request
  const { id, isAdmin, iamGroups } = user

  if (!id) return res.status(401).send('Unauthorized')

  const hasAccess = await checkAccess(iamGroups)

  if (!isAdmin && !hasAccess) return res.status(401).send('Unauthorized')

  return res.send(user)
})

export default userRouter
