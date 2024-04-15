import express from 'express'

import { ChatInstance } from '../db/models'

const chatInstanceRouter = express.Router()

chatInstanceRouter.get('/', async (req, res) => {
  const { limit: limitStr, offset: offsetStr } = req.query
  const limit = limitStr ? parseInt(limitStr as string, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0
  const chatInstances = await ChatInstance.findAll({
    limit,
    offset,
    order: [['activityPeriod.startDate', 'DESC']],
  })

  return res.send(chatInstances)
})

chatInstanceRouter.get('/count', async (req, res) => {
  const count = await ChatInstance.count()
  return res.json(count)
})

chatInstanceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  return res.send(chatInstance)
})

export default chatInstanceRouter
