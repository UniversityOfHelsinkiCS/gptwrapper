import express from 'express'

import { ChatInstance } from '../db/models'

const chatInstanceRouter = express.Router()

chatInstanceRouter.get('/', async (_, res) => {
  const services = await ChatInstance.findAll()

  return res.send(services)
})

chatInstanceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const service = await ChatInstance.findByPk(id)

  if (!service) return res.status(404).send('ChatInstance not found')

  return res.send(service)
})

export default chatInstanceRouter
