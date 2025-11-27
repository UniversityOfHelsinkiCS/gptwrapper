import express from 'express'
import { Op, Sequelize, WhereOptions } from 'sequelize'

import type { ActivityPeriod, RequestWithUser } from '../types'
import { ChatInstance, Enrolment, UserChatInstanceUsage, Prompt, User, Responsibility, Discussion } from '../db/models'
import { getTeachedCourses } from '../services/chatInstances/access'
import { encrypt, decrypt } from '../util/util'
import { ApplicationError } from '../util/ApplicationError'
import _ from 'lodash'
import { adminMiddleware } from '../middleware/adminMiddleware'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await ChatInstance.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return courses
}

courseRouter.get('/', async (req, res) => {
  const courses = await getCourses()
  res.send(courses)
})

courseRouter.get('/user', async (req, res) => {
  const request = req as RequestWithUser
  const { user } = request

  const chatInstances = await getTeachedCourses(user)

  const coursesWithExtra = _.orderBy(chatInstances, ['usageLimit', 'name'], ['desc', 'desc']).map((chatinstance) => ({
    ...chatinstance.toJSON(),
    isActive: chatinstance.usageLimit > 0 && Date.parse(chatinstance.activityPeriod.endDate) > Date.now(),
    isExpired: Date.parse(chatinstance.activityPeriod.endDate) < Date.now(),
  }))

  res.send(coursesWithExtra)
})

courseRouter.get('/statistics/:id', async (req, res) => {
  const { id } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: { courseId: id },
  })

  const request = req as unknown as RequestWithUser
  const { user } = request

  if (!chatInstance) throw ApplicationError.NotFound('ChatInstance not found')

  enforceUserHasFullAccess(user, chatInstance)

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


  const request = req as unknown as RequestWithUser
  const { user } = request

  await enforceUserHasStudentOrFullAccess(user, chatInstance)

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

  await enforceUserHasFullAccess(user, chatInstance)

  res.send(chatInstance.enrolments)
})

//checks if user is a admin or is responsible for the course, returns forbidden error if not
export const enforceUserHasFullAccess = async (user, chatInstance: ChatInstance) => {
  const isResponsibleForCourse: boolean = await userAssignedAsResponsible(user.id, chatInstance)
  const hasFullAccess: boolean = user.isAdmin || isResponsibleForCourse

  if (!hasFullAccess) {
    throw ApplicationError.Forbidden('Unauthorized')
  }

  return hasFullAccess
}

export const chatIsActive = (chatInstance: ChatInstance) => {
  const start = new Date(chatInstance.activityPeriod.startDate)
  const end = new Date(chatInstance.activityPeriod.endDate)
  const today = new Date()

  const todayIsMoreOrEqualToStart = today >= start
  const todayIsLessOrEqualToEnd = today <= end
  const usageLimitMoreThanZero = chatInstance.usageLimit > 0 

  return todayIsMoreOrEqualToStart && todayIsLessOrEqualToEnd && usageLimitMoreThanZero
}


//allows users that are students or admins to access the course. If as user is a student then the course must be open for students
export const enforceUserHasStudentOrFullAccess = async (user, chatInstance: ChatInstance) => {
  const enrolments = await Enrolment.findAll({
    where: { chatInstanceId: chatInstance.id },
  })

  const isEnrolled = enrolments ? enrolments.find((u) => u.userId === user.id) : false
  const courseIsOpen = chatIsActive(chatInstance)

  //the user is a student so let the user access
  if (isEnrolled && courseIsOpen) {
    return true
  }

  //check if fullaccess
  const fullAccess = await enforceUserHasFullAccess(user, chatInstance)
  if (fullAccess) {
    return true
  }

  //the enforceUserHasFullAcess should throw an error but just in case we throw another one
  throw ApplicationError.Forbidden('Unauthorized')
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

const userAssignedAsResponsible = async (userId, chatInstance: ChatInstance) => {

  const responsibilities = await Responsibility.findOne({
    where: {
       userId: userId,
       chatInstanceId: chatInstance.id
    },
  })

  if (!responsibilities) {
    return false
  }

  return true
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
  const hasPermission = await enforceUserHasFullAccess(user, chatInstance)
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

courseRouter.post('/:id/responsibilities/remove', async (req, res) => {
  const courseId = req.params.id
  const body = req.body as {
    username: string
  }
  const assignedUserUsername: string = body.username

  const request = req as unknown as RequestWithUser
  const { user } = request
  const chatInstance = await getChatInstance(courseId)
  const hasPermission = await enforceUserHasFullAccess(user, chatInstance)
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
  const hasPermission = await enforceUserHasFullAccess(user, chatInstance)
  if (!hasPermission) {
    res.status(401).send('Unauthorized')
    return
  }

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
