import express from 'express'
import { Op, Sequelize } from 'sequelize'

import { ActivityPeriod, RequestWithUser } from '../types'
import {
  ChatInstance,
  Enrolment,
  UserChatInstanceUsage,
  Prompt,
  User,
  Responsibility,
  Discussion,
} from '../db/models'
import { getOwnCourses } from '../chatInstances/access'
import { encrypt, decrypt } from '../util/util'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await ChatInstance.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return courses
}

courseRouter.get('/', async (_, res) => {
  const courses = await getCourses()

  res.send(courses)
})

courseRouter.get('/user', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request

  const courseIds = await getOwnCourses(user)

  const { rows: chatinstances, count } = await ChatInstance.findAndCountAll({
    where: {
      courseId: {
        [Op.in]: courseIds,
      },
    },
    order: [
      ['usageLimit', 'DESC'],
      ['name', 'DESC'],
    ], // @TODO: Fix sort order fakd
  })

  const coursesWithExtra = chatinstances.map((chatinstance) => ({
    ...chatinstance.toJSON(),
    isActive:
      chatinstance.usageLimit > 0 &&
      Date.parse(chatinstance.activityPeriod.endDate) > Date.now(),
    isExpired: Date.parse(chatinstance.activityPeriod.endDate) < Date.now(),
  }))

  res.send({ courses: coursesWithExtra, count })
})

courseRouter.get('/statistics/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw new Error('ChatInstance not found')

  const usages = await UserChatInstanceUsage.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolments = await Enrolment.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolledUsages = usages
    .filter((usage) => enrolments.map((e) => e.userId).includes(usage.userId))
    .filter((u) => u.usageCount > 0)

  const usagePercentage = enrolledUsages.length / enrolments.length

  const average =
    enrolledUsages.map((u) => u.usageCount).reduce((a, b) => a + b, 0) /
    enrolledUsages.length

  const normalizedUsage = enrolledUsages.map((usage) => ({
    ...usage,
    usageCount: (usage.usageCount / chatInstance.usageLimit) * 100,
  }))

  res.send({ average, usagePercentage, usages: normalizedUsage })
})

interface AcualResponsibility {
  id: string
  user: {
    id: string
    username: string
    last_name: string
    first_names: string
  }
}

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const request = req as unknown as RequestWithUser
  const { user } = request

  const include = [
    {
      model: Responsibility,
      as: 'responsibilities',
      attributes: ['id'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'last_name', 'first_names'],
        },
      ],
    },
    {
      model: Prompt,
      as: 'prompts',
    },
    {
      model: Enrolment,
      as: 'enrolments',
      attributes: ['id'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'username',
            'last_name',
            'first_names',
            'student_number',
          ],
        },
      ],
    },
  ]

  const chatInstance = (await ChatInstance.findOne({
    where: { courseId: id },
    include,
  })) as ChatInstance & { responsibilities: AcualResponsibility[] }

  const hasFullAccess =
    user.isAdmin ||
    chatInstance.responsibilities.map((r) => r.user.id).includes(user.id)

  const objectToReturn = hasFullAccess
    ? chatInstance
    : {
        ...chatInstance.toJSON(),
        enrolments: undefined,
        responsibilities: undefined,
      }

  res.send(objectToReturn)
})

/*
const checkDiscussionAccess = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const request = req as unknown as RequestWithUser
  const { user } = request

  const { id } = req.params
  const chatInstance = (await ChatInstance.findOne({
    where: { courseId: id },
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        attributes: ['id'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'last_name', 'first_names'],
          },
        ],
      },
    ],
  })) as ChatInstance & { responsibilities: AcualResponsibility[] }

  const hasFullAccess =
    user.isAdmin ||
    chatInstance.responsibilities.map((r) => r.user.id).includes(user.id)

  if (!hasFullAccess) {
    return res.status(401).send('Unauthorized')
  }

  return next()
}
*/

courseRouter.get(
  '/:id/discussions/:user_id',
  //checkDiscussionAccess,
  async (req, res) => {
    const userId = decrypt(req.params.user_id)
    const { id } = req.params
    const discussions = await Discussion.findAll({
      where: {
        courseId: id,
        userId,
      },
    })

    res.send(discussions.map((d) => d))
  }
)

//courseRouter.get('/:id/discussers', checkDiscussionAccess, async (req, res) => {
courseRouter.get('/:id/discussers', async (req, res) => {
  const { id } = req.params

  const discussionCounts = (await Discussion.findAll({
    attributes: [
      'user_id',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'discussion_count'],
    ],
    where: { courseId: id },
    group: ['user_id'],
  })) as any

  res.send(
    discussionCounts.map((disc) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { user_id, discussion_count } = disc.dataValues
      return {
        user_id: encrypt(user_id).encryptedData,
        discussion_count,
      }
    })
  )
})

courseRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { activityPeriod, model, usageLimit } = req.body as {
    activityPeriod: ActivityPeriod
    model: string
    usageLimit: number
  }

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw new Error('ChatInstance not found')

  chatInstance.activityPeriod = activityPeriod
  chatInstance.model = model
  chatInstance.usageLimit = usageLimit

  await chatInstance.save()

  res.send(chatInstance)
})

export default courseRouter
