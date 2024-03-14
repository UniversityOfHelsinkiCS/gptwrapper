import express from 'express'

import { RequestWithUser } from '../types'
import { Service, UserServiceUsage, User } from '../db/models'
import { getCourse } from '../util/importer'

const adminRouter = express.Router()

adminRouter.use((req, _, next) => {
  const request = req as RequestWithUser
  const { user } = request

  if (!user.isAdmin) throw new Error('Unauthorized')

  return next()
})

interface NewServiceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

adminRouter.post('/services', async (req, res) => {
  const data = req.body as NewServiceData
  const { name, description, model, usageLimit, courseId } = data

  const course = await getCourse(courseId)
  if (!course) return res.status(404).send('Invalid course id')

  const newService = await Service.create({
    name,
    description,
    model,
    usageLimit,
    courseId,
    activityPeriod: course.activityPeriod,
  })

  return res.status(201).send(newService)
})

interface UpdatedServiceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

adminRouter.put('/services/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as UpdatedServiceData
  const { name, description, model, usageLimit, courseId } = data

  const service = await Service.findByPk(id)

  if (!service) return res.status(404).send('Service not found')

  service.name = name
  service.description = description
  service.model = model
  service.usageLimit = usageLimit
  service.courseId = courseId

  await service.save()

  return res.send(service)
})

adminRouter.delete('/services/:id', async (req, res) => {
  const { id } = req.params

  const service = await Service.findByPk(id)

  if (!service) return res.status(404).send('Service not found')

  await UserServiceUsage.destroy({
    where: { serviceId: id },
  })

  await service.destroy()

  return res.status(204).send()
})

adminRouter.get('/services/usage', async (_, res) => {
  const usage = await UserServiceUsage.findAll({
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: Service,
        as: 'service',
      },
    ],
  })

  return res.send(usage)
})

adminRouter.delete('/services/usage/:id', async (req, res) => {
  const { id } = req.params

  const serviceUsage = await UserServiceUsage.findByPk(id)

  if (!serviceUsage) return res.status(404).send('Service usage not found')

  await serviceUsage.destroy()

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

export default adminRouter
