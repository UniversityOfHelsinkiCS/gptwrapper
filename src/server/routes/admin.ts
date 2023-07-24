import express from 'express'

import { ChatRequest } from '../types'
import { ServiceAccessGroup } from '../db/models'

const adminRouter = express.Router()

adminRouter.use((req, _, next) => {
  const request = req as ChatRequest
  const { user } = request

  if (!user.isAdmin) throw new Error('Unauthorized')

  return next()
})

adminRouter.get('/accessGroups', async (_, res) => {
  const accessGroups = await ServiceAccessGroup.findAll()

  return res.send(accessGroups)
})

export interface NewAccessGroupData {
  iamGroup: string
  model?: string
  usageLimit?: string
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

export interface UpdatedAccessGroupData {
  iamGroup: string
  model: string
  usageLimit: string
  resetCron: string
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

export default adminRouter
