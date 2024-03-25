import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod } from '../types'
import { ChatInstance } from '../db/models'
import { getOwnCourses } from '../services/access'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await ChatInstance.findAll({
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

  const courses = await ChatInstance.findAll({
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

  const service = await ChatInstance.findOne({
    where: { courseId: id },
    include: 'prompts',
  })

  return res.send(service)
})

courseRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { activityPeriod } = req.body as { activityPeriod: ActivityPeriod }

  const service = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!service) throw new Error('ChatInstance not found')

  service.activityPeriod = activityPeriod
  service.save()

  return res.send(service)
})

export default courseRouter
