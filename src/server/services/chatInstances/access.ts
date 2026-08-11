import { type ChatInstance, Enrolment, Prompt, RagIndex, Responsibility, User as UserModel } from '../../db/models'
import type { User } from '../../../shared/user'
import { TEST_COURSES, TEST_USERS } from '../../../shared/testData'
import logger from '../../util/logger'

const getUserById = async (id: string) => UserModel.findByPk(id)

const findEnrolments = async (userId: string) =>
  (await Enrolment.findAll({
    where: {
      userId: userId,
    },
    include: [
      {
        association: Responsibility.associations.chatInstance,
        include: [
          {
            model: Responsibility,
            as: 'responsibilities',
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
      },
    ],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

export const getEnrolledCourses = async (user: User) => {
  const enrolledToSandbox = user.isAdmin || user.iamGroups.includes(TEST_USERS.enrolled)
  const enrolments = await findEnrolments(user.id)

  if (!enrolledToSandbox) return enrolments

  const sandboxChatInstanceIds = [TEST_COURSES.OTE_SANDBOX.id, ...(user.iamGroups.includes('grp-toska') ? [TEST_COURSES.TOSKA.id] : [])]

  const existingChatInstanceIds = new Set(enrolments.map((enrolment) => enrolment.chatInstanceId))
  const missingChatInstanceIds = sandboxChatInstanceIds.filter((id) => !existingChatInstanceIds.has(id))

  if (missingChatInstanceIds.length === 0) return enrolments

  // Having any enrolment already proves the user row exists (FK). Otherwise we
  // have to check, since the user may not be persisted yet on their first login.
  if (enrolments.length === 0 && !(await getUserById(user.id))) {
    logger.info(`[access] getEnrolledCourses user=${user.id} not yet in db, skipping sandbox upserts`)
    return enrolments
  }

  await Promise.all(
    missingChatInstanceIds.map(async (chatInstanceId) => {
      try {
        await Enrolment.upsert(
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
        logger.info(`Failed to upsert sandbox course enrolment for user ${user.id} on ${chatInstanceId}: ${(err as Error).message}`)
      }
    }),
  )

  return findEnrolments(user.id)
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
        include: [
          {
            model: Responsibility,
            as: 'responsibilities',
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
      },
    ],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

export const getTeachedCourses = async (user: User) => {
  const teacherOfSandbox = user.isAdmin || user.iamGroups.includes(TEST_USERS.teachers)

  const responsibilities = await findResponsibilities(user.id)

  if (!teacherOfSandbox) return responsibilities.map((responsibility) => responsibility.chatInstance)

  const sandboxChatInstanceIds = Object.values(TEST_COURSES).map((course) => course.id)

  const existingChatInstanceIds = new Set(responsibilities.map((responsibility) => responsibility.chatInstanceId))
  const missingChatInstanceIds = sandboxChatInstanceIds.filter((id) => !existingChatInstanceIds.has(id))

  if (missingChatInstanceIds.length === 0) return responsibilities.map((responsibility) => responsibility.chatInstance)

  // Having any responsibility already proves the user row exists (FK). Otherwise we
  // have to check, since the user may not be persisted yet on their first login.
  if (responsibilities.length === 0 && !(await getUserById(user.id))) {
    logger.info(`[access] getTeachedCourses user=${user.id} not yet in db, skipping sandbox upserts`)
    return responsibilities.map((responsibility) => responsibility.chatInstance)
  }

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

  const refetched = await findResponsibilities(user.id)

  return refetched.map((responsibility) => responsibility.chatInstance)
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
