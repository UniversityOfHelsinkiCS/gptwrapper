import express from 'express'
import { Op } from 'sequelize'
import { addMonths } from 'date-fns'

import { ChatInstance, User, UserChatInstanceUsage } from '../db/models'
import { DEFAULT_MODEL_ON_ENABLE, DEFAULT_TOKEN_LIMIT } from '../../config'
import { sequelize } from '../db/connection'

const chatInstanceRouter = express.Router()

chatInstanceRouter.get('/', async (req, res) => {
  const {
    limit: limitStr,
    offset: offsetStr,
    search: searchRaw,
    order: orderRaw,
    orderBy: orderByRaw,
  } = req.query
  const limit = limitStr ? parseInt(limitStr as string, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0
  const search = String(searchRaw)
  const order = String(orderRaw)
  const orderBy = String(orderByRaw)
  const hasSearch = search && search.length >= 4

  const { rows: chatInstances, count } = await ChatInstance.findAndCountAll({
    attributes: {
      include: [
        [
          sequelize.literal(`(
                      SELECT COUNT(*)
                      FROM prompts
                      WHERE prompts.chat_instance_id = "ChatInstance"."id" 
                  )`),
          'promptCount',
        ],
      ],
      exclude: ['updatedAt', 'createdAt'],
    },

    where: hasSearch
      ? {
          [Op.or]: [
            { courseId: { [Op.like]: `${search}%` } },
            { 'name.en': { [Op.iLike]: `%${search}%` } },
            { 'name.fi': { [Op.iLike]: `%${search}%` } },
            { 'name.sv': { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined,
    limit,
    offset,
    order: [[sequelize.literal(`"${orderBy}"`), order]],
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
