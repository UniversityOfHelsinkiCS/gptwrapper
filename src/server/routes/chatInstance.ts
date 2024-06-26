import express from 'express'
import { Op } from 'sequelize'
import { addMonths } from 'date-fns'

import { ChatInstance, User, UserChatInstanceUsage } from '../db/models'
import { DEFAULT_MODEL_ON_ENABLE, DEFAULT_TOKEN_LIMIT } from '../../config'

const chatInstanceRouter = express.Router()

chatInstanceRouter.get('/', async (req, res) => {
  const { limit: limitStr, offset: offsetStr, search: searchRaw } = req.query
  const limit = limitStr ? parseInt(limitStr as string, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0
  const search = String(searchRaw)
  const hasSearch = search && search.length >= 4

  const { rows: chatInstances, count } = await ChatInstance.findAndCountAll({
    where: hasSearch
      ? {
          [Op.or]: [
            { courseId: { [Op.like]: `${search}%` } },
            { name: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined,
    limit,
    offset,
    order: [['activityPeriod.startDate', 'DESC']],
  })

  return res.send({ chatInstances, count })
})

chatInstanceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  return res.send(chatInstance)
})

chatInstanceRouter.post('/:id/enable', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  const defaultActivityPeriod = {
    startDate: chatInstance.activityPeriod.startDate,
    endDate: addMonths(chatInstance.activityPeriod.endDate, 1).toDateString(),
  }

  chatInstance.usageLimit = DEFAULT_TOKEN_LIMIT
  chatInstance.activityPeriod = defaultActivityPeriod
  chatInstance.model = DEFAULT_MODEL_ON_ENABLE

  await chatInstance.save()

  return res.send(chatInstance)
})

chatInstanceRouter.post('/:id/disable', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  chatInstance.usageLimit = 0

  await chatInstance.save()

  return res.send(chatInstance)
})

chatInstanceRouter.get('/:id/usages', async (req, res) => {
  const { id } = req.params

  const usage = await UserChatInstanceUsage.findAll({
    where: {
      chatInstanceId: id,
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

chatInstanceRouter.delete('/usage/:id', async (req, res) => {
  const { id } = req.params

  const chatInstanceUsage = await UserChatInstanceUsage.findByPk(id)

  if (!chatInstanceUsage)
    return res.status(404).send('ChatInstance usage not found')

  chatInstanceUsage.usageCount = 0

  chatInstanceUsage.save()

  return res.status(204).send()
})

export default chatInstanceRouter
