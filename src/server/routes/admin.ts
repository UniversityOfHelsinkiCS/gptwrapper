import express from 'express'

import { RequestWithUser } from '../types'
import { ChatInstance, UserChatInstanceUsage, User } from '../db/models'
import { getCourse } from '../util/importer'
import { run as runUpdater } from '../updater'

const adminRouter = express.Router()

adminRouter.use((req, _, next) => {
  const request = req as RequestWithUser
  const { user } = request

  if (!user.isAdmin) throw new Error('Unauthorized')

  return next()
})

interface NewChatInstanceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

adminRouter.post('/chatinstances', async (req, res) => {
  const data = req.body as NewChatInstanceData
  const { name, description, model, usageLimit, courseId } = data

  const course = await getCourse(courseId)
  if (!course) return res.status(404).send('Invalid course id')

  const newChatInstance = await ChatInstance.create({
    name,
    description,
    model,
    usageLimit,
    courseId,
    activityPeriod: course.activityPeriod,
  })

  return res.status(201).send(newChatInstance)
})

interface UpdatedChatInstanceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

adminRouter.put('/chatinstances/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as UpdatedChatInstanceData
  const { name, description, model, usageLimit, courseId } = data

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  chatInstance.name = name
  chatInstance.description = description
  chatInstance.model = model
  chatInstance.usageLimit = usageLimit
  chatInstance.courseId = courseId

  await chatInstance.save()

  return res.send(chatInstance)
})

adminRouter.delete('/chatinstances/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  await UserChatInstanceUsage.destroy({
    where: { chatInstanceId: id },
  })

  await chatInstance.destroy()

  return res.status(204).send()
})

adminRouter.get('/chatinstances/usage', async (_, res) => {
  const usage = await UserChatInstanceUsage.findAll({
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

  return res.send(usage)
})

adminRouter.delete('/chatinstances/usage/:id', async (req, res) => {
  const { id } = req.params

  const chatInstanceUsage = await UserChatInstanceUsage.findByPk(id)

  if (!chatInstanceUsage)
    return res.status(404).send('ChatInstance usage not found')

  await chatInstanceUsage.destroy()

  return res.status(204).send()
})

adminRouter.get('/users', async (_, res) => {
  const usage = await User.findAll({
    attributes: ['id', 'username', 'iamGroups', 'usage'],
  })

  return res.send(usage)
})

adminRouter.delete('/usage/:userId', async (req, res) => {
  const { userId } = req.params

  const user = await User.findByPk(userId)

  if (!user) return res.status(404).send('User not found')

  user.usage = 0

  await user.save()

  return res.status(204).send()
})

adminRouter.post('/run-updater', async (req, res) => {
  runUpdater()
  return res.send('Updater started')
})

export default adminRouter
