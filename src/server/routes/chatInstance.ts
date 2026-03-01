import { Router } from 'express'
import { Op } from 'sequelize'
import { addMonths } from 'date-fns'
import { z } from 'zod/v4'

import { ChatInstance, Responsibility, User, UserChatInstanceUsage } from '../db/models'
import { DEFAULT_TOKEN_LIMIT } from '../../config'
import { sequelize } from '../db/connection'
import { ApplicationError } from '../util/ApplicationError'
import { adminMiddleware } from '../middleware/adminMiddleware'
import { ChatInstanceAccess, getChatInstanceAccess } from '../services/chatInstances/access'
import { RequestWithUser } from '../types'
import { LocaleSchema } from '@shared/lang'

const chatInstanceRouter = Router()

const NewCustomChatInstanceSchema = z.object({
  name: LocaleSchema,
  description: z.string().optional(),
})

const CustomChatInstanceParamsSchema = z.object({
  id: z.string().min(1),
})

const getAuthorizedCustomChatInstance = async (req: RequestWithUser<{ id: string }>) => {
  const { user } = req
  const { id } = CustomChatInstanceParamsSchema.parse(req.params)
  console.log(id)

  if (!user.isCourseCreator) {
    throw ApplicationError.Forbidden()
  }

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance || chatInstance.courseId) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const responsibility = await Responsibility.findOne({
    where: {
      userId: user.id,
      chatInstanceId: chatInstance.id,
    },
  })

  if (!responsibility) {
    throw ApplicationError.Forbidden()
  }

  return chatInstance
}

chatInstanceRouter.post('/custom', async (req, res) => {
  const { user } = req as RequestWithUser

  if (!user.isCourseCreator) {
    throw ApplicationError.Forbidden()
  }

  const { name, description } = NewCustomChatInstanceSchema.parse(req.body)

  const now = new Date()

  const chatInstance = await ChatInstance.create({
    name,
    description: description?.trim() || '',
    usageLimit: DEFAULT_TOKEN_LIMIT,
    courseId: null,
    activityPeriod: {
      startDate: now.toISOString(),
      endDate: addMonths(now, 12).toISOString(),
    },
    saveDiscussions: false,
    notOptoutSaving: false,
  })

  await Responsibility.create({
    userId: user.id,
    chatInstanceId: chatInstance.id,
    createdByUserId: user.id,
  })

  res.status(201).send(chatInstance)
})

chatInstanceRouter.get('/custom', async (req, res) => {
  const { user } = req as RequestWithUser

  if (!user.isCourseCreator) {
    throw ApplicationError.Forbidden()
  }

  const chatInstances = await ChatInstance.findAll({
    where: {
      courseId: null,
    },
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        attributes: [],
        required: true,
        where: {
          userId: user.id,
        },
      },
    ],
    order: [['createdAt', 'DESC']],
  })

  res.send(chatInstances)
})

chatInstanceRouter.put('/custom/:id', async (req, res) => {
  const chatInstance = await getAuthorizedCustomChatInstance(req as RequestWithUser<{ id: string }>)
  const { name, description } = NewCustomChatInstanceSchema.parse(req.body)

  chatInstance.name = name
  chatInstance.description = description?.trim() || ''

  await chatInstance.save()

  res.send(chatInstance)
})

chatInstanceRouter.delete('/custom/:id', async (req, res) => {
  const chatInstance = await getAuthorizedCustomChatInstance(req as RequestWithUser<{ id: string }>)

  await UserChatInstanceUsage.destroy({
    where: {
      chatInstanceId: chatInstance.id,
    },
  })

  await chatInstance.destroy()

  res.status(204).send()
})

chatInstanceRouter.get('/', [adminMiddleware], async (req, res) => {
  const { limit: limitStr, offset: offsetStr, search: searchRaw, order: orderRaw, orderBy: orderByRaw, showActiveCourses: showActiveCoursesRaw } = req.query
  const limit = limitStr ? parseInt(limitStr as string, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0
  const search = String(searchRaw)
  const order = String(orderRaw)
  const orderBy = String(orderByRaw)
  const showActiveCourses = String(showActiveCoursesRaw)
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
        [
          sequelize.literal(`(
            SELECT COALESCE(SUM(usage_count), 0)
            FROM user_chat_instance_usages
            WHERE user_chat_instance_usages.chat_instance_id = "ChatInstance"."id"
        )`),
          'tokenUsage',
        ],
      ],
      exclude: ['updatedAt', 'createdAt'],
    },
    where:
      showActiveCourses === 'true'
        ? {
            'activityPeriod.endDate': {
              [Op.gt]: new Date().toISOString(),
            },
            'activityPeriod.startDate': {
              [Op.lt]: new Date().toISOString(),
            },
          }
        : hasSearch
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
    order: [[orderBy === 'activityPeriod' ? 'activityPeriod.startDate' : sequelize.literal(`"${orderBy}"`), order]],
  })

  res.send({ chatInstances, count })
})

chatInstanceRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  res.send(chatInstance)
})

chatInstanceRouter.post('/:id/enable', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const { user } = req as RequestWithUser<{ id: string }>
  const access = await getChatInstanceAccess(user, chatInstance)
  if (access < ChatInstanceAccess.TEACHER) {
    throw ApplicationError.Forbidden()
  }

  const defaultActivityPeriod = chatInstance.courseActivityPeriod
    ? {
        startDate: chatInstance.courseActivityPeriod.startDate,
        endDate: addMonths(chatInstance.courseActivityPeriod?.endDate, 1).toDateString(),
      }
    : {
        startDate: new Date().toDateString(),
        endDate: addMonths(new Date(), 1).toDateString(),
      }

  chatInstance.usageLimit = DEFAULT_TOKEN_LIMIT
  chatInstance.activityPeriod = defaultActivityPeriod

  await chatInstance.save()

  res.send(chatInstance)
})

chatInstanceRouter.post('/:id/disable', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const { user } = req as RequestWithUser<{ id: string }>
  const access = await getChatInstanceAccess(user, chatInstance)
  if (access < ChatInstanceAccess.TEACHER) {
    throw ApplicationError.Forbidden()
  }

  chatInstance.usageLimit = 0

  await chatInstance.save()

  res.send(chatInstance)
})

chatInstanceRouter.get('/:id/usages', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)
  if (!chatInstance) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const { user } = req as RequestWithUser<{ id: string }>
  const access = await getChatInstanceAccess(user, chatInstance)
  if (access < ChatInstanceAccess.TEACHER) {
    throw ApplicationError.Forbidden()
  }

  const usage = (await UserChatInstanceUsage.findAll({
    where: {
      chatInstanceId: id,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'student_number', 'last_name', 'first_names', 'username'],
      },
      {
        model: ChatInstance,
        as: 'chatInstance',
      },
    ],
  })) as any[]

  const anon_user = {
    id: 'hidden',
    student_number: 'hidden',
    last_name: 'hidden',
    first_names: 'hidden',
    username: 'hidden',
  }

  const usageLimit = chatInstance.usageLimit
  const saveDiscussions = chatInstance.saveDiscussions

  const sanitizedUsage = usage.map((u) => {
    return {
      ...u.toJSON(),
      user: saveDiscussions ? anon_user : u.user,
      userId: !saveDiscussions || u.usageCount > 0.8 * usageLimit ? u.userId : 'hidden',
      UserId: !saveDiscussions || u.usageCount > 0.8 * usageLimit ? u.userId : 'hidden',
    }
  })

  res.status(200).send(sanitizedUsage)
})

chatInstanceRouter.delete('/usage/:id', async (req, res) => {
  const { id } = req.params

  const chatInstanceUsage = await UserChatInstanceUsage.findByPk(id)

  if (!chatInstanceUsage) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const chatInstance = await ChatInstance.findByPk(chatInstanceUsage.chatInstanceId)
  if (!chatInstance) {
    throw ApplicationError.NotFound('ChatInstance not found')
  }

  const { user } = req as RequestWithUser<{ id: string }>
  const access = await getChatInstanceAccess(user, chatInstance)
  if (access < ChatInstanceAccess.TEACHER) {
    throw ApplicationError.Forbidden()
  }

  chatInstanceUsage.usageCount = 0

  chatInstanceUsage.save()

  res.status(204).send()
})

export default chatInstanceRouter
