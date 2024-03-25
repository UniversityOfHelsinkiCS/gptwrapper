import express from 'express'

import { ChatInstance } from '../db/models'

const chatInstanceRouter = express.Router()

chatInstanceRouter.get('/', async (_, res) => {
  const chatInstances = await ChatInstance.findAll()

  return res.send(chatInstances)
})

chatInstanceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  return res.send(chatInstance)
})

export default chatInstanceRouter
