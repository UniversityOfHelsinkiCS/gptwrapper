import { Router } from 'express'
import { inProduction } from '../../config'
import { getTestUserHeaders, TEST_COURSES } from '../../shared/testData'
import { ChatInstanceRagIndex, Enrolment, Prompt, RagIndex, Responsibility, User, UserChatInstanceUsage } from '../db/models'
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

  const testUserIds = [userId, temporalTeacherId]

  logger.info(`Resetting test data for user ${userId}`)

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
    console.log("creating enrolment", testUserRole, TEST_COURSES.TEST_COURSE)
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

  logger.info('Test data reset successfully')

  res.status(200).json({ message: 'Test data reset successfully' })
})

export default router
