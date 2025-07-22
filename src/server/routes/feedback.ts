import express from 'express'
import z from 'zod/v4'
import { Feedback } from '../db/models'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'

const feedbackRouter = express.Router()

const FeedbackPostSchema = z.object({
  feedback: z.string().min(1).max(40_000),
  responseWanted: z.boolean().default(false),
  metadata: z
    .object({
      courseId: z.string(),
      model: z.string(),
      promptId: z.string(),
      ragIndexId: z.number(),
      nMessages: z.number(),
      fileSearchesMade: z.number(),
      filesUploaded: z.number(),
    })
    .partial()
    .default({}),
})

feedbackRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
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
