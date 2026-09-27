import { type ChatInstance, Enrolment, Prompt, RagIndex, Responsibility, User as UserModel } from '../../db/models'
import type { User } from '../../../shared/user'
import { STAFF_COURSES } from '../../../shared/testData'
import logger from '../../util/logger'

const chatInstanceWithPrompts = {
  include: [
    {
      model: Responsibility,
      as: 'responsibilities',
      separate: true,
      attributes: ['id', 'createdByUserId'],
      include: [
        {
          model: UserModel,
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
}

const findEnrolments = async (userId: string) =>
  (await Enrolment.findAll({
    where: {
      userId: userId,
    },
    include: [
      {
        association: Enrolment.associations.chatInstance,
        ...chatInstanceWithPrompts,
      },
    ],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

export const getEnrolledCourses = async (user: User) => {
  const enrolments = await findEnrolments(user.id)
  return enrolments
}

/**
 * Gets the chat instance ids of the courses the user is enrolled in
 */
export const getEnrolledCourseIds = async (user: User) => {
  const enrollments = await getEnrolledCourses(user)
  const courseIds = enrollments.map((enrolment) => enrolment.chatInstance.courseId) as string[]

  return courseIds
}

const findResponsibilities = async (userId: string) =>
  (await Responsibility.findAll({
    where: {
      userId,
    },
    include: [
      {
        association: Responsibility.associations.chatInstance,
        ...chatInstanceWithPrompts,
      },
    ],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

export const ensureSandboxAccess = async (user: User) => {
  const isAdmin = user.isAdmin
  const isToska = user.iamGroups.includes('grp-toska')

  if (!isAdmin && !isToska) return

  const responsibilities = await findResponsibilities(user.id)

  const sandboxChatInstanceIds: Array<string> = []
  if (isAdmin) {
    sandboxChatInstanceIds.push(STAFF_COURSES.OTE_SANDBOX.id)
  }
  if (isToska) {
    sandboxChatInstanceIds.push(STAFF_COURSES.TOSKA.id)
  }

  const existingChatInstanceIds = new Set(responsibilities.map((responsibility) => responsibility.chatInstanceId))
  const missingChatInstanceIds = sandboxChatInstanceIds.filter((id) => !existingChatInstanceIds.has(id))

  if (missingChatInstanceIds.length === 0) return

  await Promise.all(
    missingChatInstanceIds.map(async (chatInstanceId) => {
      try {
        await Responsibility.upsert(
          {
            userId: user.id,
            chatInstanceId,
          },
          // TS is wrong here. It expects fields in camelCase
          // while the actual fields need to be in snake_case
          // @ts-expect-error
          { conflictFields: ['user_id', 'chat_instance_id'] },
        )
      } catch (err: unknown) {
        logger.info(`Failed to upsert sandbox course responsibility for user ${user.id} on ${chatInstanceId}: ${(err as Error).message}`)
      }
    }),
  )
}
export const getTeachedCourses = async (user: User) => {
  const responsibilities = await findResponsibilities(user.id)

  return responsibilities.map((responsibility) => responsibility.chatInstance)
}

/**
 * @todo use this for authorization always.
 */
export const ChatInstanceAccess = {
  ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
  NONE: 0,
}

export const getChatInstanceAccess = async (user: User, chatInstance: ChatInstance) => {
  if (user.isAdmin) return ChatInstanceAccess.ADMIN

  const [responsibilities, enrolments] = await Promise.all([
    Responsibility.findAll({
      attributes: ['id'],
      where: {
        userId: user.id,
        chatInstanceId: chatInstance.id,
      },
    }),
    Enrolment.findAll({
      attributes: ['id'],
      where: {
        userId: user.id,
        chatInstanceId: chatInstance.id,
      },
    }),
  ])

  if (responsibilities.length > 0) return ChatInstanceAccess.TEACHER
  if (enrolments.length > 0) return ChatInstanceAccess.STUDENT

  return ChatInstanceAccess.NONE
}
