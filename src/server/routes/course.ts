import express from 'express'
import { Op, Sequelize, WhereOptions } from 'sequelize'

import type { ActivityPeriod, RequestWithUser } from '../types'
import { ChatInstance, Enrolment, UserChatInstanceUsage, Prompt, PromptUsage, User, Responsibility, Discussion, RagIndex } from '../db/models'
import { getAccessLevel, getEnrolledCourses, getTeachedCourses } from '../services/chatInstances/access'
import { encrypt, decrypt } from '../util/util'
import { ApplicationError } from '../util/ApplicationError'
import logger from '../util/logger'
import _ from 'lodash'
import type { User as SharedUser } from '@shared/user'
import { chatIsActive, getChatStatus } from '../services/chatInstances/activity'
import { AccessLevel } from '@shared/types'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await ChatInstance.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return courses
}

courseRouter.get('/', async (_req, res) => {
  const courses = await getCourses()
  res.send(courses)
})

courseRouter.get('/user', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request

  const [teached, enrolled] = await Promise.all([getTeachedCourses(user), getEnrolledCourses(user)])
  const decorate = (ci: ChatInstance, accessLevel: AccessLevel) => ({
    ...ci.toJSON(),
    expired: Date.parse(ci.activityPeriod.endDate) < Date.now(),
    status: getChatStatus(ci),
    accessLevel,
  })

  const byId = new Map<string, ReturnType<typeof decorate>>()

  // getChatStatus throws on a broken activityPeriod. Skip that course instead of failing the whole list.
  for (const ci of teached) {
    try {
      byId.set(ci.id, decorate(ci, 'FULL'))
    } catch {
      logger.warn('Skipping a taught course with a broken activity period', { chatInstanceId: ci.id })
    }
  }

  // The enrolled filter hides closed courses, so STUDENT_CLOSED cannot occur here.
  for (const { chatInstance } of enrolled.filter(({ chatInstance }) => chatIsActive(chatInstance))) {
    if (byId.has(chatInstance.id)) continue
    byId.set(chatInstance.id, decorate(chatInstance, user.isAdmin ? 'FULL' : 'STUDENT'))
  }

  res.send([...byId.values()])
})

courseRouter.get('/statistics/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  const request = req as unknown as RequestWithUser
  const { user } = request

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  await enforceUserHasFullAccess(user, chatInstance)

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

courseRouter.get('/statistics/:id/prompt-usages', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  const request = req as unknown as RequestWithUser
  const { user } = request

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  await enforceUserHasFullAccess(user, chatInstance)

  const { startDate, endDate } = chatInstance.activityPeriod

  const promptUsages = await PromptUsage.findAll({
    where: {
      chatInstanceId: chatInstance.id,
      createdAt: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate),
      },
    },
    attributes: [
      'promptId',
      [Sequelize.fn('DATE', Sequelize.col('PromptUsage.created_at')), 'date'],
      [Sequelize.fn('SUM', Sequelize.col('token_count')), 'totalTokens'],
      [Sequelize.fn('COUNT', Sequelize.col('PromptUsage.id')), 'messageCount'],
    ],
    include: [
      {
        model: Prompt,
        as: 'prompt',
        attributes: ['name'],
        required: false,
      },
    ],
    group: ['promptId', 'prompt.id', Sequelize.fn('DATE', Sequelize.col('PromptUsage.created_at'))],
    order: [[Sequelize.fn('DATE', Sequelize.col('PromptUsage.created_at')), 'ASC']],
    raw: true,
    nest: true,
  })

  const result = promptUsages.map((pu) => ({
    promptId: pu.promptId,
    promptName: pu.prompt?.name ?? null,
    date: (pu as any).date as string,
    totalTokens: Number((pu as any).totalTokens),
    messageCount: Number((pu as any).messageCount),
  }))

  res.send(result)
})

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await getChatInstance(id)

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  const request = req as unknown as RequestWithUser
  const { user } = request

  const accessLevel = await requireCourseAccess(user, chatInstance)

  res.send(serializeCourse(chatInstance, accessLevel))
})

courseRouter.get('/:id/enrolments', async (req: express.Request, res: express.Response) => {
  const request = req as unknown as RequestWithUser
  const { user } = request

  const { id } = req.params
  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
    include: [
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

  await enforceUserHasFullAccess(user, chatInstance)

  res.send(chatInstance.enrolments)
})

//checks if user is a admin or is responsible for the course, returns forbidden error if not
export const enforceUserHasFullAccess = async (user: SharedUser, chatInstance: ChatInstance) => {
  const accessLevel = await getAccessLevel(user, chatInstance)

  if (accessLevel !== 'FULL') {
    throw ApplicationError.Forbidden('Unauthorized')
  }
}

const requireCourseAccess = async (user: SharedUser, chatInstance: ChatInstance): Promise<AccessLevel> => {
  const accessLevel = await getAccessLevel(user, chatInstance)

  if (!accessLevel) {
    throw ApplicationError.Forbidden('Unauthorized')
  }
  return accessLevel
}

export const serializeCourse = (chatInstance: ChatInstance, accessLevel: AccessLevel) => {
  const base = { ...chatInstance.toJSON(), status: getChatStatus(chatInstance), accessLevel }
  return accessLevel === 'STUDENT_CLOSED' ? { ...base, prompts: [] } : base
}

// returns a chatInstance, throws an chat instance not found if not found
const getChatInstance = async (courseId: string) => {
  const chatInstance = await ChatInstance.findOne({
    where: { courseId: courseId },
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
        include: [
          {
            model: RagIndex,
            as: 'ragIndex',
            attributes: ['metadata'],
          },
        ],
      },
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  return chatInstance
}

const checkDiscussionAccess = async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const { user } = req as unknown as RequestWithUser

  const chatInstance = await ChatInstance.findOne({ where: { courseId: req.params.id } })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  await enforceUserHasFullAccess(user, chatInstance)

  next()
}

courseRouter.get('/:id/discussions', checkDiscussionAccess, async (req, res) => {
  const { id } = req.params
  const discussions = await Discussion.findAll({
    where: { courseId: id },
    order: [['createdAt', 'ASC']],
  })

  res.send(discussions.map((d) => ({ ...d.toJSON(), userId: encrypt(d.userId).encryptedData })))
})

courseRouter.get('/:id/discussions/:user_id', checkDiscussionAccess, async (req, res) => {
  const userId = decrypt(req.params.user_id)
  const { id } = req.params
  const discussions = await Discussion.findAll({
    where: {
      courseId: id,
      userId,
    },
    order: [['createdAt', 'ASC']],
  })

  res.send(discussions.map((d) => ({ ...d.toJSON(), userId: req.params.user_id })))
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
  const { activityPeriod, usageLimit, saveDiscussions, activated } = req.body as {
    activityPeriod?: ActivityPeriod
    usageLimit?: number
    saveDiscussions?: boolean
    activated?: boolean
  }

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  const request = req as unknown as RequestWithUser
  const { user } = request
  await enforceUserHasFullAccess(user, chatInstance)

  if (activityPeriod !== undefined) {
    chatInstance.activityPeriod = activityPeriod
  }
  if (usageLimit !== undefined) {
    chatInstance.usageLimit = usageLimit
  }
  if (saveDiscussions !== undefined) {
    chatInstance.saveDiscussions = saveDiscussions
  }
  if (activated !== undefined) {
    chatInstance.activated = activated
  }

  await chatInstance.save()

  res.send(chatInstance)
})

// Asks about the target user of an assign or remove, not the requester, so not an access level.
const userAssignedAsResponsible = async (userId, chatInstance: ChatInstance) => {
  const responsibilities = await Responsibility.findOne({
    where: {
      userId: userId,
      chatInstanceId: chatInstance.id,
    },
  })

  if (!responsibilities) {
    return false
  }

  return true
}

const userEnrolledToCourse = async (userId, chatInstance: ChatInstance) => {
  const enrolment = await Enrolment.findOne({
    where: {
      userId,
      chatInstanceId: chatInstance.id,
    },
  })

  return Boolean(enrolment)
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
  const courseId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

  const userToAssign = await getUserByUsername(assignedUserUsername)
  if (!userToAssign) {
    res.status(400).send('User not found with username')
    return
  }

  const assignedUserId = userToAssign.id
  const userAssignedAlready = await userAssignedAsResponsible(assignedUserId, chatInstance)
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

courseRouter.post('/:id/enrolments/assign', async (req, res) => {
  const courseId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

  const userToAssign = await getUserByUsername(assignedUserUsername)
  if (!userToAssign) {
    res.status(400).send('User not found with username')
    return
  }

  const userAlreadyEnrolled = await userEnrolledToCourse(userToAssign.id, chatInstance)
  if (userAlreadyEnrolled) {
    res.status(400).send('User is already enrolled to the course')
    return
  }

  const createdEnrolment = await Enrolment.create({
    userId: userToAssign.id,
    chatInstanceId: chatInstance.id,
  })

  res.json({
    id: createdEnrolment.id,
    user: {
      id: userToAssign.id,
      username: userToAssign.username,
      first_names: userToAssign.firstNames,
      last_name: userToAssign.lastName,
      student_number: userToAssign.studentNumber,
    },
  })
})

courseRouter.post('/:id/enrolments/remove', async (req, res) => {
  const courseId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

  const userToRemove = await getUserByUsername(assignedUserUsername)
  if (!userToRemove) {
    res.status(400).send('User not found with username')
    return
  }

  const enrolment = await Enrolment.findOne({
    where: {
      userId: userToRemove.id,
      chatInstanceId: chatInstance.id,
    },
  })

  if (!enrolment) {
    res.status(400).send('User enrolment not found')
    return
  }

  try {
    await enrolment.destroy()
    res.json({ result: 'success' })
  } catch {
    res.status(500).send('Unknown error occurred')
  }
})

courseRouter.post('/:id/responsibilities/remove', async (req, res) => {
  const courseId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

  const userToRemove: User | null = await getUserByUsername(assignedUserUsername)
  if (!userToRemove) {
    res.status(400).send('User not found with username')
    return
  }

  const assignedUserId: string = userToRemove.id
  const userAssignedAlready: boolean = await userAssignedAsResponsible(assignedUserId, chatInstance)
  if (!userAssignedAlready) {
    res.status(400).send('User to remove not found')
    return
  }

  const responsibilityToRemove = await Responsibility.findOne({
    where: {
      userId: assignedUserId,
      chatInstanceId: chatInstance.id,
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

courseRouter.get('/:id/responsibilities/users/:search', async (req, res) => {
  const { id: courseId, search: search } = req.params

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

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

courseRouter.get('/:id/enrolments/users/:search', async (req, res) => {
  const { id: courseId, search } = req.params

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  await enforceUserHasFullAccess(user, chatInstance)

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

export default courseRouter
