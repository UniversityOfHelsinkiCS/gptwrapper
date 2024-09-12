import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod, RequestWithUser } from '../types'
import {
  ChatInstance,
  Enrolment,
  UserChatInstanceUsage,
  Prompt,
  User,
} from '../db/models'
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

  if (!chatInstance) throw new Error('ChatInstance not found')

  const usages = await UserChatInstanceUsage.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolments = await Enrolment.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolledUsages = usages
    .filter((usage) => enrolments.map((e) => e.userId).includes(usage.userId))
    .filter((u) => u.usageCount > 0)

  const usagePercentage = enrolledUsages.length / enrolments.length

  const average =
    enrolledUsages.map((u) => u.usageCount).reduce((a, b) => a + b, 0) /
    enrolledUsages.length

  const normalizedUsage = enrolledUsages.map((usage) => ({
    ...usage,
    usageCount: (usage.usageCount / chatInstance.usageLimit) * 100,
  }))

  return res.send({ average, usagePercentage, usages: normalizedUsage })
})

courseRouter.get('/:id', async (req, res) => {
  const request = req as unknown as RequestWithUser
  const { user } = request
  const { id } = req.params

  const includeNormal = [
    {
      model: Prompt,
      as: 'prompts',
    },
  ]

  const includeAdmin = [
    ...includeNormal,
    {
      model: Enrolment,
      as: 'enrolments',
      attributes: ['id'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'last_name', 'first_names'],
        },
      ],
    },
  ]

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
    include: user.isAdmin ? includeAdmin : includeNormal,
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
