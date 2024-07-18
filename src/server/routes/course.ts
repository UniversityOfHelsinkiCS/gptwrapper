import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod, RequestWithUser } from '../types'
import { ChatInstance, Enrolment, UserChatInstanceUsage } from '../db/models'
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

courseRouter.get('/statistics/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  const usages = await UserChatInstanceUsage.findAll({
    where: { chatInstanceId: chatInstance.id },
  })
  const enrolments = await Enrolment.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolledUsages = usages.filter((usage) =>
    enrolments.map((e) => e.userId).includes(usage.userId)
  )
  const usagePercentage = enrolledUsages.length / enrolments.length

  const average =
    usages.map((u) => u.usageCount).reduce((a, b) => a + b, 0) / usages.length

  return res.send({ average, usagePercentage })
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
  const { activityPeriod, model, usageLimit } = req.body as {
    activityPeriod: ActivityPeriod
    model: string
    usageLimit: number
  }

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw new Error('ChatInstance not found')

  chatInstance.activityPeriod = activityPeriod
  chatInstance.model = model
  chatInstance.usageLimit = usageLimit

  await chatInstance.save()

  return res.send(chatInstance)
})

export default courseRouter
