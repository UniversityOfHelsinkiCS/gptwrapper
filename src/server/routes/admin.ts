import express from 'express'
import { Op } from 'sequelize'

import { sequelize } from '../db/connection'

import { RequestWithUser } from '../types'
import { ChatInstance, UserChatInstanceUsage, User, Prompt } from '../db/models'
import { getCourse } from '../util/importer'
import { run as runUpdater } from '../updater'
import InfoText from '../db/models/infotext'
import { statsViewerIams } from '../util/config'
import { generateTerms } from '../util/util'

const adminRouter = express.Router()

adminRouter.use((req, _, next) => {
  const request = req as RequestWithUser
  const { user } = request

  const isStatsViewer = statsViewerIams.some((iam) =>
    user.iamGroups.includes(iam)
  )
  const isAllowed =
    user.isAdmin || (isStatsViewer && req.path.includes('/statistics'))

  if (!isAllowed) throw new Error('Unauthorized')

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
    name: { en: name, fi: name, sv: name },
    description,
    model,
    usageLimit,
    courseId,
    activityPeriod: course.activityPeriod,
  })

  return res.status(201).send(newChatInstance)
})

const getUsages = async () => {
  const [usages] = (await sequelize.query(`
    SELECT u.*
    FROM user_chat_instance_usages u
    LEFT JOIN responsibilities r
    ON u.user_id = r.user_id AND u.chat_instance_id = r.chat_instance_id
    WHERE r.user_id IS NULL AND usage_count > 0;  
  `)) as any[]

  return usages.map((usage) => ({
    id: usage.id,
    userId: usage.user_id,
    usageCount: usage.usage_count,
    chatInstanceId: usage.chat_instance_id,
  }))
}

// this function is mostly garbage
adminRouter.get('/statistics', async (req, res) => {
  const terms = generateTerms()

  const mangelStats = async () => {
    const usages = await getUsages()

    const courses = {}
    // eslint-disable-next-line no-restricted-syntax
    for (const usage of usages) {
      if (!courses[usage.chatInstanceId]) {
        courses[usage.chatInstanceId] = {
          students: 0,
          usedTokens: 0,
        }
      }
      courses[usage.chatInstanceId].students += 1
      courses[usage.chatInstanceId].usedTokens += usage.usageCount
    }

    const getTermsOf = ({ courseActivityPeriod }) => {
      const checkDateOverlap = (term, course) =>
        new Date(term.startDate) <= new Date(course.endDate || '2112-12-21') &&
        new Date(term.endDate) >= new Date(course.startDate)

      if (!courseActivityPeriod) return []

      return terms.filter((term) =>
        checkDateOverlap(term, courseActivityPeriod)
      )
    }

    function getUniqueValues(array) {
      return array.reduce((acc, value) => {
        if (!acc.includes(value)) {
          acc.push(value)
        }
        return acc
      }, [])
    }

    const extractFields = (chatInstance: ChatInstance & { prompts: any[] }) => {
      const units = chatInstance.courseUnits

      const codes = units.map((u) => u.code)
      const programmes = units.flatMap((item) =>
        item.organisations.map((org) => org.code)
      )

      return {
        startDate: chatInstance.activityPeriod.startDate,
        endDate: chatInstance.activityPeriod.endDate,
        terms: getTermsOf(chatInstance),
        id: chatInstance.courseId,
        name: chatInstance.name,
        codes: getUniqueValues(codes),
        programmes: getUniqueValues(programmes),
        students: courses[chatInstance.id].students,
        usedTokens: courses[chatInstance.id].usedTokens,
        promptCount: chatInstance.prompts.length,
      }
    }

    const datas = []

    // eslint-disable-next-line no-restricted-syntax
    for (const courseId of Object.keys(courses)) {
      // eslint-disable-next-line no-await-in-loop
      const chatInstance = (await ChatInstance.findByPk(courseId, {
        include: [
          {
            model: Prompt,
            as: 'prompts',
            attributes: ['id'],
          },
        ],
      })) as ChatInstance & { prompts: any[] }

      datas.push(extractFields(chatInstance))
    }

    return datas
  }

  return res.send({
    data: await mangelStats(),
    terms,
  })
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
  const { description, model, usageLimit, courseId, name } = data

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) return res.status(404).send('ChatInstance not found')

  chatInstance.name = { en: name, fi: name, sv: name }
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

adminRouter.get('/users/:search', async (req, res) => {
  const { search } = req.params
  let where = null

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

  return res.send(matches)
})

adminRouter.delete('/usage/:userId', async (req, res) => {
  const { userId } = req.params

  const user = await User.findByPk(userId)

  if (!user) return res.status(404).send('User not found')

  user.usage = 0

  await user.save()

  return res.status(204).send()
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

  return res.send({
    params,
    persons: persons.map((person) => ({
      ...person.dataValues,
    })),
    count,
  })
})

adminRouter.post('/run-updater', async (req, res) => {
  runUpdater()
  return res.send('Updater started')
})

adminRouter.put('/info-texts/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as InfoText
  const { text } = data

  const infoText = await InfoText.findByPk(id)

  infoText.text = text

  await infoText.save()

  return res.send(infoText)
})

export default adminRouter
