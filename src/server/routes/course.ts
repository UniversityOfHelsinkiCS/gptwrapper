import express from 'express'
import { Op } from 'sequelize'

import { Service } from '../db/models'
import { getOwnCourses } from '../services/access'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await Service.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return courses
}

courseRouter.get('/', async (_, res) => {
  const courses = await getCourses()

  return res.send(courses)
})

courseRouter.get('/user', async (req, res) => {
  const { id, isAdmin } = (req as any).user

  const courseIds = await getOwnCourses(id, isAdmin)

  const courses = await Service.findAll({
    where: {
      courseId: {
        [Op.in]: courseIds,
      },
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
