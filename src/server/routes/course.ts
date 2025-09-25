import express from 'express'
import { Op, Sequelize } from 'sequelize'

import type { ActivityPeriod, RequestWithUser } from '../types'
import { ChatInstance, Enrolment, UserChatInstanceUsage, Prompt, User, Responsibility, Discussion } from '../db/models'
import { getOwnCourses } from '../services/chatInstances/access'
import { encrypt, decrypt } from '../util/util'
import { ApplicationError } from '../util/ApplicationError'

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
    isActive: chatinstance.usageLimit > 0 && Date.parse(chatinstance.activityPeriod.endDate) > Date.now(),
    isExpired: Date.parse(chatinstance.activityPeriod.endDate) < Date.now(),
  }))

  res.send({ courses: coursesWithExtra, count })
})

courseRouter.get('/statistics/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  const usages = await UserChatInstanceUsage.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolments = await Enrolment.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const enrolledUsages = usages.filter((usage) => enrolments.map((e) => e.userId).includes(usage.userId)).filter((u) => u.totalUsageCount > 0)

  const usagePercentage = enrolledUsages.length / enrolments.length

  const average = enrolledUsages.map((u) => u.totalUsageCount).reduce((a, b) => a + b, 0) / enrolledUsages.length

  const normalizedUsage = enrolledUsages.map((usage) => ({
    ...usage,
    usageCount: (usage.usageCount / chatInstance.usageLimit) * 100,
  }))

  res.send({ average, usagePercentage, usages: normalizedUsage })
})

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await getChatInstance(id)
  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  res.send(chatInstance)
})

courseRouter.get('/:id/enrolments', async (req: express.Request, res: express.Response) => {
  const request = req as unknown as RequestWithUser
  const { user } = request

  const { id } = req.params
  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        attributes: ['userId'],
      },
      {
        model: Enrolment,
        as: 'enrolments',
        attributes: ['id'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'last_name', 'first_names', 'student_number'],
          },
        ],
      },
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  const hasFullAccess =
    user.isAdmin ||
    chatInstance.responsibilities
      ?.map((r) => r.userId)
      .filter(Boolean)
      .includes(user.id)

  if (!hasFullAccess) {
    throw ApplicationError.Forbidden('Unauthorized')
  }

  res.send(chatInstance.enrolments)
})

//checks if user is a admin or is responsible for the course, returns forbidden error if not
const enforceUserHasFullAccess = async (user, chatInstance) => {
  const isResponsibleForCourse = userAssignedAsResponsible(user.id, chatInstance)
  const hasFullAccess: boolean = user.isAdmin || isResponsibleForCourse
  if (!hasFullAccess) {
    throw ApplicationError.Forbidden('Unauthorized')
  }
  return hasFullAccess
}

// returns a chatInstance, throws an chat instance not found if not found
const getChatInstance = async (id) => {
  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        attributes: ['id', 'createdByUserId'],
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
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  return chatInstance
}

const checkDiscussionAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  })) as ChatInstance

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  const hasFullAccess =
    user.isAdmin ||
    chatInstance.responsibilities
      ?.map((r) => r.user?.id)
      .filter(Boolean)
      .includes(user.id)

  if (!hasFullAccess) {
    res.status(401).send('Unauthorized')
  } else {
    next()
  }
}

courseRouter.get('/:id/discussions/:user_id', checkDiscussionAccess, async (req, res) => {
  const userId = decrypt(req.params.user_id)
  const { id } = req.params
  const discussions = await Discussion.findAll({
    where: {
      courseId: id,
      userId,
    },
  })

  res.send(discussions.map((d) => d))
})

courseRouter.get('/:id/discussers', checkDiscussionAccess, async (req, res) => {
  const { id } = req.params

  const discussionCounts = (await Discussion.findAll({
    attributes: ['user_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'discussion_count']],
    where: { courseId: id },
    group: ['user_id'],
  })) as any

  res.send(
    discussionCounts.map((disc) => {
      const { user_id, discussion_count } = disc.dataValues
      return {
        user_id: encrypt(user_id).encryptedData,
        discussion_count,
      }
    }),
  )
})

courseRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { activityPeriod, usageLimit, saveDiscussions, notOptoutSaving } = req.body as {
    activityPeriod: ActivityPeriod
    usageLimit: number
    saveDiscussions: boolean
    notOptoutSaving: boolean
  }

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  chatInstance.activityPeriod = activityPeriod
  chatInstance.usageLimit = usageLimit
  if (saveDiscussions !== undefined) {
    chatInstance.saveDiscussions = saveDiscussions
    chatInstance.notOptoutSaving = notOptoutSaving
  }

  await chatInstance.save()

  res.send(chatInstance)
})

const userAssignedAsResponsible = (userId, chatInstance) => {
  const isResponsible: boolean = chatInstance.responsibilities
    ?.map((r) => {
      return r.user?.id
    })
    .filter(Boolean)
    .includes(userId)
  return isResponsible
}

const getUserByUsername = async (username: string): Promise<User | null> => {
  const user = await User.findOne({
    where: {
      username: username,
    },
    raw: true,
  })
  return user
}
courseRouter.post('/:id/responsibilities/assign', async (req, res) => {
  const chatInstanceId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(chatInstanceId)
  const hasPermission = await enforceUserHasFullAccess(user, chatInstanceId)
  if (!hasPermission) {
    res.status(401).send('Unauthorized')
    return
  }

  const userToAssign = await getUserByUsername(assignedUserUsername)
  if (!userToAssign) {
    res.status(400).send('User not found with username')
    return
  }

  const assignedUserId = userToAssign.id
  const userAssignedAlready = userAssignedAsResponsible(assignedUserId, chatInstance)
  if (userAssignedAlready) {
    res.status(400).send('User is already responsible for the course')
    return
  }

  const createdResponsibility = await Responsibility.create({
    userId: assignedUserId,
    chatInstanceId: chatInstance.id,
    createdByUserId: user.id,
  })

  const responsibilityToReturn = {
    id: createdResponsibility.id,
    createdByUserId: createdResponsibility.createdByUserId,
    user: {
      id: userToAssign.id,
      first_names: userToAssign.firstNames,
      last_name: userToAssign.lastName,
      username: userToAssign.username,
    },
  }

  res.json(responsibilityToReturn)
})

courseRouter.post('/:id/responsibilities/remove', async (req, res) => {
  const chatInstanceId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(chatInstanceId)
  const hasPermission = await enforceUserHasFullAccess(user, chatInstanceId)
  if (!hasPermission) {
    res.status(401).send('Unauthorized')
    return
  }

  const userToRemove: User | null = await getUserByUsername(assignedUserUsername)
  if (!userToRemove) {
    res.status(400).send('User not found with username')
    return
  }

  const assignedUserId: string = userToRemove.id
  const userAssignedAlready: boolean = userAssignedAsResponsible(assignedUserId, chatInstance)
  if (!userAssignedAlready) {
    res.status(400).send('User to remove not found')
    return
  }

  const responsibilityToRemove = await Responsibility.findOne({
    where: {
      userId: assignedUserId,
      chatInstanceId: chatInstanceId,
    },
  })
  if (!responsibilityToRemove?.createdByUserId) {
    res.status(400).send('Can only remove user that has been manually added')
    return
  }

  try {
    await responsibilityToRemove?.destroy()
    res.json({ result: 'success' })
  } catch {
    res.status(500).send('Unknown error occurred')
  }
})
export default courseRouter
