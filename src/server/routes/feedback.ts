import express from 'express'
import { Feedback } from '../db/models'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'
import { FeedbackPostSchema } from '../../shared/feedback'

const feedbackRouter = express.Router()

feedbackRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
  console.log(req.body)
  const feedbackBody = FeedbackPostSchema.parse(req.body)

  const fb = await Feedback.create({
    userId: user.id,
    feedback: feedbackBody.feedback,
    responseWanted: feedbackBody.responseWanted,
    metadata: feedbackBody.metadata,
  })

  res.status(201).json(fb)
})

feedbackRouter.get('/', async (req, res) => {
  const { user } = req as RequestWithUser

  if (!user.isAdmin) {
    throw ApplicationError.Forbidden()
  }

  const feedbacks = await Feedback.findAll({
    order: [['createdAt', 'DESC']],
  })

  res.status(200).json(feedbacks)
})

export default feedbackRouter
