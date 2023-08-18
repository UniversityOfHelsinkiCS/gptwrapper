import express from 'express'

import { RequestWithUser, Message } from '../types'
import { ServiceAccessGroup, Service } from '../db/models'

const adminRouter = express.Router()

adminRouter.use((req, _, next) => {
  const request = req as RequestWithUser
  const { user } = request

  if (!user.isAdmin) throw new Error('Unauthorized')

  return next()
})

adminRouter.get('/accessGroups', async (_, res) => {
  const accessGroups = await ServiceAccessGroup.findAll()

  return res.send(accessGroups)
})

interface NewAccessGroupData {
  iamGroup: string
  model: string
  usageLimit: number
  resetCron?: string
}

adminRouter.post('/accessGroups', async (req, res) => {
  const data = req.body as NewAccessGroupData
  const { iamGroup, model, usageLimit, resetCron } = data

  const newAccessGroup = await ServiceAccessGroup.create({
    serviceId: 'chat',
    iamGroup,
    model,
    usageLimit,
    resetCron,
  })

  return res.status(201).send(newAccessGroup)
})

interface UpdatedAccessGroupData {
  iamGroup: string
  model: string
  usageLimit: number
  resetCron: string | null
}

adminRouter.put('/accessGroups/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as UpdatedAccessGroupData
  const { iamGroup, model, usageLimit, resetCron } = data

  const accessGroup = await ServiceAccessGroup.findByPk(id)

  if (!accessGroup) return res.status(404).send('Access group not found')

  accessGroup.iamGroup = iamGroup
  accessGroup.model = model
  accessGroup.usageLimit = usageLimit
  accessGroup.resetCron = resetCron

  await accessGroup.save()

  return res.send(accessGroup)
})

adminRouter.delete('/accessGroups/:id', async (req, res) => {
  const { id } = req.params

  const accessGroup = await ServiceAccessGroup.findByPk(id)

  if (!accessGroup) return res.status(404).send('Access group not found')

  await accessGroup.destroy()

  return res.status(204).send()
})

adminRouter.get('/services', async (req, res) => {
  const services = await Service.findAll()

  return res.send(services)
})

interface NewServiceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
  prompt?: Message[]
}

adminRouter.post('/services', async (req, res) => {
  const data = req.body as NewServiceData
  const { name, description, model, usageLimit, courseId, prompt } = data

  const newService = await Service.create({
    name,
    description,
    model,
    usageLimit,
    courseId,
    prompt,
  })

  return res.status(201).send(newService)
})

interface UpdatedServiceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
  prompt: Message[]
}

adminRouter.put('/services/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as UpdatedServiceData
  const { name, description, model, usageLimit, courseId, prompt } = data

  const service = await Service.findByPk(id)

  if (!service) return res.status(404).send('Service not found')

  service.name = name
  service.description = description
  service.model = model
  service.usageLimit = usageLimit
  service.courseId = courseId
  service.prompt = prompt

  await service.save()

  return res.send(service)
})

adminRouter.delete('/services/:id', async (req, res) => {
  const { id } = req.params

  const service = await Service.findByPk(id)

  if (!service) return res.status(404).send('Service not found')

  await service.destroy()

  return res.status(204).send()
})

export default adminRouter
