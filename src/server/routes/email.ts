import express from 'express'

import type { RequestWithUser } from '../types'
import sendEmail from '../util/pate'

const emailRouter = express.Router()

emailRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
  const { text, subject } = req.body

  if (!user?.email) {
    res.status(400).send('User has no email address')
    return
  }

  const hasText = typeof text === 'string' && text.trim().length > 0
  const hasSubject = typeof subject === 'string' && subject.trim().length > 0

  if (!hasText || !hasSubject) {
    res.status(400).send('Missing text or subject')
    return
  }

  await sendEmail([user.email], text, subject)

  res.status(204).send()
})

export default emailRouter
