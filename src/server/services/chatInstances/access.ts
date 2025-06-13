import { TEST_COURSES, TEST_USERS } from '../../util/config'
import { ChatInstance, Enrolment, Responsibility, User as UserModel } from '../../db/models'
import { User } from '../../types'

const getUserById = async (id: string) => UserModel.findByPk(id)

export const getEnrolledCourses = async (user: User) => {
  // Only do the example/test course upserts if the user is an admin or member of the special course
  // We also want to check if the user exists in the database
  // before we try to upsert the enrolments.
  const enrolledToSandbox = user.isAdmin || user.iamGroups.includes(TEST_USERS.enrolled)
  if (enrolledToSandbox && (await getUserById(user.id))) {
    await Enrolment.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSES.OTE_SANDBOX.id,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] },
    )
  }

  const enrollments = (await Enrolment.findAll({
    where: {
      userId: user.id,
    },
    include: [Enrolment.associations.chatInstance],
  })) as (Enrolment & { chatInstance: ChatInstance })[]

  return enrollments
}

/**
 * Gets the chat instance ids of the courses the user is enrolled in
 */
export const getEnrolledCourseIds = async (user: User) => {
  const enrollments = await getEnrolledCourses(user)
  const courseIds = enrollments.map((enrolment) => enrolment.chatInstance.courseId) as string[]

  return courseIds
}

export const getOwnCourses = async (user: User) => {
  // We want to check if the user exists in the database
  // before we try to upsert the enrolments
  const teacherOfSandbox = user.isAdmin || user.iamGroups.includes(TEST_USERS.teachers)

  console.log('teacherOfSandbox', user.id, user.isAdmin, user.iamGroups, TEST_USERS.teachers, user.iamGroups.includes(TEST_USERS.teachers))
  if (teacherOfSandbox && (await getUserById(user.id))) {
    await Responsibility.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSES.OTE_SANDBOX.id,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] },
    )
    await Responsibility.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSES.EXAMPLE_COURSE.id,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] },
    )
    await Responsibility.upsert(
      {
        userId: user.id,
        chatInstanceId: TEST_COURSES.TEST_COURSE.id,
      },
      // TS is wrong here. It expects fields in camelCase
      // while the actual fields need to be in snake_case
      // @ts-expect-error
      { conflictFields: ['user_id', 'chat_instance_id'] },
    )
  }

  const responsibilities = (await Responsibility.findAll({
    where: {
      userId: user.id,
    },
    include: [Responsibility.associations.chatInstance],
  })) as (Responsibility & { chatInstance: ChatInstance })[]

  const courseIds = responsibilities.map((responsibility) => responsibility.chatInstance.courseId) as string[]

  return courseIds
}
