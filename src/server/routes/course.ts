import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod, RequestWithUser } from '../types'
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
  const request = req as RequestWithUser
  const { user } = request

  const courseIds = await getOwnCourses(user)

  const { rows: chatinstances, count } = await ChatInstance.findAndCountAll({
    where: {
      courseId: {
        [Op.in]: courseIds,
      },
    },
    order: [
      ['usageLimit', 'DESC'],
      ['name', 'DESC'],
    ], // @TODO: Fix sort order fakd
  })

  const coursesWithExtra = chatinstances.map((chatinstance) => ({
    ...chatinstance.toJSON(),
    isActive:
      chatinstance.usageLimit > 0 &&
      Date.parse(chatinstance.activityPeriod.endDate) > Date.now(),
    isExpired: Date.parse(chatinstance.activityPeriod.endDate) < Date.now(),
  }))

  return res.send({ courses: coursesWithExtra, count })
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
