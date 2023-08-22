import express from 'express'

import { Service } from '../db/models'

const serviceRouter = express.Router()

serviceRouter.get('/', async (_, res) => {
  const services = await Service.findAll()

  return res.send(services)
})

serviceRouter.get('/:courseId', async (req, res) => {
  const { courseId } = req.params

  const service = await Service.findOne({
    where: { courseId },
    include: 'prompts',
  })

  return res.send(service)
})

export default serviceRouter
