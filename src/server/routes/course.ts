import express from 'express'
import { Op } from 'sequelize'

import { ActivityPeriod, RequestWithUser } from '../types'
import { ChatInstance, User, UserChatInstanceUsage } from '../db/models'
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

courseRouter.get('/usage/:courseId', async (req: RequestWithUser, res: any) => {
  const { user } = req
  const { courseId } = req.params

  if (!user.isAdmin && !user.ownCourses?.includes(courseId))
    throw new Error('Unauthorized')

  const usage = await UserChatInstanceUsage.findAll({
    where: {
      chatInstanceId: courseId,
    },
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: ChatInstance,
        as: 'chatInstance',
      },
    ],
  })

  if (usage.length === 0)
    return res.status(404).send('ChatInstanceUsages not found')

  return res.status(200).send(usage)
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
