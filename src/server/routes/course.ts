import express from 'express'
import { Op } from 'sequelize'

import { Service } from '../db/models'

const courseRouter = express.Router()

courseRouter.get('/', async (_, res) => {
  const courses = await Service.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return res.send(courses)
})

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const service = await Service.findOne({
    where: { courseId: id },
    include: 'prompts',
  })

  return res.send(service)
})

export default courseRouter
