import express from 'express'
import { Op, WhereOptions } from 'sequelize'

import { ChatInstance, UserChatInstanceUsage, User } from '../db/models'
import { getCourse } from '../util/importer'
import { run as runUpdater } from '../updater'
import { ApplicationError } from '../util/ApplicationError'
import { adminMiddleware } from '../middleware/adminMiddleware'

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
    notOptoutSaving: false,
  })

  res.status(201).send(newChatInstance)
})

interface UpdatedChatInstanceData {
  name: string
  description: string
  usageLimit: number
  courseId: string
}

adminRouter.put('/chatinstances/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as UpdatedChatInstanceData
  const { description, usageLimit, courseId, name } = data

  const chatInstance = await ChatInstance.findByPk(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('Invalid chat instance id')
  }

  chatInstance.name = { en: name, fi: name, sv: name }
  chatInstance.description = description
  chatInstance.usageLimit = usageLimit
  chatInstance.courseId = courseId

  await chatInstance.save()

  res.send(chatInstance)
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

adminRouter.post('/run-updater', async (req, res) => {
  runUpdater()
  res.send('Updater started')
})

export default adminRouter
