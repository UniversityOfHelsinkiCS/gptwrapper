import express from 'express'

import { Service } from '../db/models'

const serviceRouter = express.Router()

serviceRouter.get('/', async (_, res) => {
  const services = await Service.findAll()

  return res.send(services)
})

export default serviceRouter
