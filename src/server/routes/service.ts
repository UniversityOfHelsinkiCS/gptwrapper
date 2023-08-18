import express from 'express'

import { Service } from '../db/models'

const serviceRouter = express.Router()

serviceRouter.get('/:courseId', async (req, res) => {
  const { courseId } = req.params

  const service = await Service.findOne({
    where: { courseId },
  })

  return res.send(service)
})

export default serviceRouter
