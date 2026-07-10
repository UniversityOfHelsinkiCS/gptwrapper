import { Router } from 'express'
import { inProduction } from '../../config'
import { getTestUserHeaders, TEST_COURSES } from '../../shared/testData'
import { ChatInstance, ChatInstanceRagIndex, Enrolment, Prompt, RagIndex, Responsibility, User, UserChatInstanceUsage } from '../db/models'
import { headersToUser } from '../middleware/user'
import { ApplicationError } from '../util/ApplicationError'
import logger from '../util/logger'
import { Op } from 'sequelize'

const router = Router()

router.post('/reset-test-data', async (req, res) => {
  if (inProduction) {
    throw ApplicationError.InternalServerError('Cannot call this in production')
  }

  // Reset data of the test user that is mutated in tests
  const testUserIdx = req.body.testUserIdx as string
  const testUserRole = req.body.testUserRole as 'teacher' | 'student' | 'admin'
  const testUserHeaders = getTestUserHeaders(testUserIdx, testUserRole)
  const userId = testUserHeaders.hypersonsisuid

  // Create one temporal teacher for the test user
  const temporalTeacherHeaders = Object.fromEntries(
    Object.entries(getTestUserHeaders(testUserIdx, 'teacher')).map(([key, value]) => [key, `temporal_teacher_${value}`]),
  )
  const temporalTeacherId = temporalTeacherHeaders.hypersonsisuid

  // Per-worker course used by the course-activation e2e. It is created only when a
  // test opts in (seedActivationCourse), but always cleaned up so a leftover Closed
  // course from a previous activation run never leaks into other specs (e.g. the
  // select-course modal's "empty tab" assertion).
  const activationCourseId = `activation-test-${testUserIdx}`
  const activationStudentId = `activation-student-${testUserIdx}`

  const testUserIds = [userId, temporalTeacherId, activationStudentId]

  logger.info(`Resetting test data for user ${userId}`)

  // Clean up the per-worker activation course before wiping its users, so foreign keys
  // (enrolments/responsibilities) are already gone via the destroy-by-userId blocks below.
  await Enrolment.destroy({ where: { chatInstanceId: activationCourseId } })
  await Responsibility.destroy({ where: { chatInstanceId: activationCourseId } })
  await ChatInstance.destroy({ where: { id: activationCourseId } })

  await Prompt.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await ChatInstanceRagIndex.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await RagIndex.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await Enrolment.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await Responsibility.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await UserChatInstanceUsage.destroy({
    where: {
      userId: {
        [Op.in]: testUserIds,
      },
    },
  })
  await User.destroy({
    where: {
      id: {
        [Op.in]: testUserIds,
      },
    },
  })

  await User.create(headersToUser(testUserHeaders))
  await User.create(headersToUser(temporalTeacherHeaders))

  if (testUserRole === 'student') {
    console.log('creating enrolment', testUserRole, TEST_COURSES.TEST_COURSE)
    await Enrolment.create({
      userId,
      chatInstanceId: TEST_COURSES.TEST_COURSE.id,
    })
  }

  const ragIndex = await RagIndex.create({
    userId: temporalTeacherId,
    metadata: {
      name: `rag-${testUserIdx}-${testUserRole}`,
      language: 'English',
    },
  })
  await ChatInstanceRagIndex.create({
    userId: temporalTeacherId,
    chatInstanceId: TEST_COURSES.TEST_COURSE.id,
    ragIndexId: ragIndex.id,
  })

  // Opt-in: a per-worker course seeded in the Closed (not activated) state, plus a
  // known enrolled student, for the course-management e2e. Isolated per worker so the
  // activation test can freely toggle usageLimit without racing other workers/specs.
  if (req.body.seedActivationCourse) {
    const activationCourse = await ChatInstance.create({
      id: activationCourseId,
      name: {
        en: `Activation test course ${testUserIdx}`,
        fi: `Aktivointitestikurssi ${testUserIdx}`,
        sv: `Aktiveringstestkurs ${testUserIdx}`,
      },
      description: '',
      usageLimit: 0, // Closed: teacher must activate it in the test
      courseId: activationCourseId,
      activityPeriod: {
        startDate: '2024-09-01',
        endDate: '2100-08-31',
      },
      saveDiscussions: false,
      courseUnits: [
        {
          code: `ACT-${testUserIdx}`,
          organisations: [{ code: 'ote', id: 'ote', name: { en: 'OTE', fi: 'OTE', sv: 'OTE' } }],
        },
      ],
    } as any)

    await Responsibility.create({
      userId,
      chatInstanceId: activationCourse.id,
      createdByUserId: userId,
    })

    await User.create({
      ...headersToUser({
        uid: `activation-student-${testUserIdx}`,
        mail: `activation-student-${testUserIdx}@toska.test.test`,
        preferredlanguage: 'en',
        hypersonsisuid: activationStudentId,
        hygroupcn: 'grp-students',
      }),
      firstNames: 'Testi',
      lastName: 'Testiopiskelija',
      studentNumber: `TESTSTUD-${testUserIdx}`,
    } as any)

    await Enrolment.create({
      userId: activationStudentId,
      chatInstanceId: activationCourse.id,
    })
  }

  logger.info('Test data reset successfully')

  res.status(200).json({ message: 'Test data reset successfully' })
})

export default router
