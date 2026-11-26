import express from 'express'
import { FeatureEventSchema } from '../../shared/featureEvents'
import { recordFeatureEvent } from '../services/featureEvents'

const analyticsRouter = express.Router()

// Does not read req.user: feature events are anonymous.
analyticsRouter.post('/events', (req, res) => {
  const event = FeatureEventSchema.parse(req.body)
  recordFeatureEvent(event)
  res.status(204).end()
})

export default analyticsRouter
