import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod } from '../types'
import { ChatInstance } from '../db/models'
import { getOwnCourses } from '../chatInstances/access'

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
  const { limit: limitStr, offset: offsetStr } = req.query
  const limit = limitStr ? parseInt(limitStr as string, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0
  const { id, isAdmin } = (req as any).user

  const courseIds = await getOwnCourses(id, isAdmin)

  const { rows: courses, count } = await ChatInstance.findAndCountAll({
    where: {
      courseId: {
        [Op.in]: courseIds,
      },
    },
    include: {
      association: 'responsibilities',
      attributes: ['userId'],
      include: [{ association: 'user', attributes: ['username'] }],
    },
    limit,
    offset,
  })

  return res.send({ courses, count })
})

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
    include: 'prompts',
  })

  return res.send(chatInstance)
})

courseRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { activityPeriod } = req.body as { activityPeriod: ActivityPeriod }

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw new Error('ChatInstance not found')

  chatInstance.activityPeriod = activityPeriod
  await chatInstance.save()

  return res.send(chatInstance)
})

export default courseRouter
