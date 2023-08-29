import express from 'express'

import { Service } from '../db/models'

const serviceRouter = express.Router()

serviceRouter.get('/', async (_, res) => {
  const services = await Service.findAll()

  return res.send(services)
})

serviceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const service = await Service.findByPk(id)

  if (!service) return res.status(404).send('Service not found')

  return res.send(service)
})

export default serviceRouter
