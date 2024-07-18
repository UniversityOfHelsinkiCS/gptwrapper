import express from 'express'
import passport from 'passport'

import { ChatRequest } from '../types'
import { getUserStatus, getUsage } from '../chatInstances/usage'
import { BASE_PATH, DEFAULT_TOKEN_LIMIT } from '../../config'

const userRouter = express.Router()

userRouter.get('/login', passport.authenticate('oidc'))

userRouter.get(
  '/callback',
  passport.authenticate('oidc', {
    failureRedirect: `${BASE_PATH || ''}/noaccess`,
  }),
  (_, res) => {
    res.redirect(BASE_PATH || '/')
  }
)

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
    ...user,
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
