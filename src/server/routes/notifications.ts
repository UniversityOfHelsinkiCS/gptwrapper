import express from 'express'
import { Op } from 'sequelize'
import { Notification } from '../db/models'
import { ApplicationError } from '../util/ApplicationError'
import { adminMiddleware } from '../middleware/adminMiddleware'

const notificationRouter = express.Router()

notificationRouter.get('/', async (req, res) => {
  const now = new Date()

  const notifications = await Notification.findAll({
    where: {
      active: true,
      [Op.or]: [
        {
          [Op.and]: [
            { startDate: { [Op.lte]: now } },
            { endDate: { [Op.gte]: now } },
          ],
        },
        {
          [Op.and]: [
            { startDate: null },
            { endDate: null },
          ],
        },
        {
          [Op.and]: [
            { startDate: null },
            { endDate: { [Op.gte]: now } },
          ],
        },
        {
          [Op.and]: [
            { startDate: { [Op.lte]: now } },
            { endDate: null },
          ],
        },
      ],
    },
    order: [
      ['priority', 'DESC'],
      ['startDate', 'ASC'],
    ],
  })

  res.json(notifications)
})

notificationRouter.get('/admin', adminMiddleware, async (req, res) => {
  const notifications = await Notification.findAll({
    order: [
      ['createdAt', 'DESC'],
    ],
  })

  res.json(notifications)
})

notificationRouter.post('/admin', adminMiddleware, async (req, res) => {
  const { message, startDate, endDate, priority, active } = req.body

  if (!message || !message.fi || !message.en || !message.sv) {
    throw ApplicationError.BadRequest('Message is required in all languages (fi, en, sv)')
  }

  const notification = await Notification.create({
    message,
    startDate: startDate || null,
    endDate: endDate || null,
    priority: priority ?? 0,
    active: active ?? true,
  })

  res.status(201).json(notification)
})

notificationRouter.put('/admin/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params
  const { message, startDate, endDate, priority, active } = req.body

  const notification = await Notification.findByPk(id)

  if (!notification) {
    throw ApplicationError.NotFound('Notification not found')
  }

  if (message && (!message.fi || !message.en || !message.sv)) {
    throw ApplicationError.BadRequest('Message is required in all languages (fi, en, sv)')
  }

  await notification.update({
    message: message ?? notification.message,
    startDate: startDate !== undefined ? startDate : notification.startDate,
    endDate: endDate !== undefined ? endDate : notification.endDate,
    priority: priority ?? notification.priority,
    active: active ?? notification.active,
  })

  res.json(notification)
})

notificationRouter.delete('/admin/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findByPk(id)

  if (!notification) {
    throw ApplicationError.NotFound('Notification not found')
  }

  await notification.destroy()

  res.status(204).send()
})

export default notificationRouter
