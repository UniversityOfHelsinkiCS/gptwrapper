import express from 'express'
import { Op, WhereOptions } from 'sequelize'

import { ChatInstance, UserChatInstanceUsage, User } from '../db/models'
import { sequelize } from '../db/connection'
import { getCourse } from '../util/importer'
import { run as runUpdater } from '../updater'
import { ApplicationError } from '../util/ApplicationError'
import { adminMiddleware } from '../middleware/adminMiddleware'
import { generateTerms, getTermsOf } from '../util/util'
import { LANGUAGES } from '../../shared/lang'
import type { ChatInstanceSearchResponse, ChatInstanceSearchResult } from '../../shared/types'

const adminRouter = express.Router()

adminRouter.use(adminMiddleware)

interface NewChatInstanceData {
  name: string
  description: string
  usageLimit: number
  courseId: string
}

adminRouter.post('/chatinstances', async (req, res) => {
  const data = req.body as NewChatInstanceData
  const { name, description, usageLimit, courseId } = data

  const course = await getCourse(courseId)
  if (!course) {
    throw ApplicationError.NotFound('Invalid course id')
  }

  const newChatInstance = await ChatInstance.create({
    name: { en: name, fi: name, sv: name },
    description,
    usageLimit,
    courseId,
    activityPeriod: course.activityPeriod,
    saveDiscussions: false,
    activated: usageLimit > 0,
  })

  res.status(201).send(newChatInstance)
})

adminRouter.delete('/chatinstances/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('Invalid chat instance id')
  }

  await UserChatInstanceUsage.destroy({
    where: { chatInstanceId: id },
  })

  await chatInstance.destroy()

  res.status(204).send()
})

adminRouter.delete('/chatinstances/usage/:id', async (req, res) => {
  const { id } = req.params

  const chatInstanceUsage = await UserChatInstanceUsage.findByPk(id)

  if (!chatInstanceUsage) {
    throw ApplicationError.NotFound('Invalid chat instance id')
  }

  await chatInstanceUsage.destroy()

  res.status(204).send()
})

adminRouter.get('/users/:search', async (req, res) => {
  const { search } = req.params
  let where = {} as WhereOptions<User>

  if (search.split(' ').length > 1) {
    const firstNames = search.split(' ')[0]
    const lastName = search.split(' ')[1]

    where = {
      firstNames: {
        [Op.iLike]: `%${firstNames}%`,
      },
      lastName: {
        [Op.iLike]: `%${lastName}%`,
      },
    }
  } else {
    where = {
      [Op.or]: [
        {
          username: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          studentNumber: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          primaryEmail: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ],
    }
  }

  const matches = await User.findAll({
    where,
    limit: 20,
  })

  res.send(matches)
})

adminRouter.delete('/usage/:userId', async (req, res) => {
  const { userId } = req.params

  const user = await User.findByPk(userId)

  if (!user) {
    throw ApplicationError.NotFound('Invalid user id')
  }

  user.usage = 0

  await user.save()

  res.status(204).send()
})

adminRouter.get('/user-search', async (req, res) => {
  const user = req.query.user as string

  const params = {} as any
  const where = {} as any

  const isSisuId = !Number.isNaN(Number(user[user.length - 1]))
  const isUsername = !isSisuId

  if (isSisuId) {
    where.id = {
      [Op.iLike]: `${user}%`,
    }
    params.id = user
  } else if (isUsername) {
    where.username = {
      [Op.iLike]: `%${user}%`,
    }
    params.username = user
  }

  const { rows: persons, count } = await User.findAndCountAll({
    where,
    limit: 20,
  })

  res.send({
    params,
    persons: persons.map((person) => ({
      ...person.dataValues,
    })),
    count,
  })
})

adminRouter.get('/chatinstance-search', async (req, res) => {
  const CHAT_INSTANCE_SEARCH_MIN_LENGTH = 3
  const DEFAULT_LIMIT = 25
  const MAX_LIMIT = 100

  const search = String(req.query.search ?? '').trim()
  const languageParam = String(req.query.language ?? '')
  const language = (LANGUAGES as readonly string[]).includes(languageParam) ? languageParam : 'en'

  const parsedLimit = parseInt(String(req.query.limit ?? ''), 10)
  const limit = Number.isNaN(parsedLimit) ? DEFAULT_LIMIT : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
  const parsedOffset = parseInt(String(req.query.offset ?? ''), 10)
  const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(parsedOffset, 0)

  if (search.length < CHAT_INSTANCE_SEARCH_MIN_LENGTH) {
    res.send({ results: [], count: 0 })
    return
  }

  const like = sequelize.escape(`%${search}%`)

  const { rows: chatInstances, count } = await ChatInstance.findAndCountAll({
    attributes: ['courseId', 'name', 'courseUnits', 'courseActivityPeriod'],
    where: {
      courseId: { [Op.ne]: null },
      [Op.or]: [
        sequelize.literal(`EXISTS (SELECT 1 FROM unnest("ChatInstance"."course_units") AS course_unit WHERE course_unit->>'code' ILIKE ${like})`),
        { [`name.${language}`]: { [Op.iLike]: `%${search}%` } },
      ],
    },
    order: [
      [sequelize.literal(`"ChatInstance"."activity_period"->>'startDate'`), 'DESC NULLS LAST'],
      ['courseId', 'DESC'],
    ],
    limit,
    offset,
  })

  const terms = generateTerms()

  const results: ChatInstanceSearchResult[] = chatInstances.map((chatInstance) => ({
    id: chatInstance.courseId as string,
    name: chatInstance.name,
    codes: [...new Set((chatInstance.courseUnits ?? []).map((unit) => unit.code))],
    terms: getTermsOf(chatInstance.courseActivityPeriod, terms),
  }))

  const response: ChatInstanceSearchResponse = { results, count }

  res.send(response)
})

adminRouter.post('/run-updater', async (_req, res) => {
  runUpdater()
  res.send('Updater started')
})

export default adminRouter
