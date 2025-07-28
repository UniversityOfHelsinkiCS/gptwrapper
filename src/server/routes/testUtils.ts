import { Router } from 'express'
import { inProduction } from '../../config'
import { ApplicationError } from '../util/ApplicationError'
import { ChatInstanceRagIndex, Enrolment, RagIndex, User, UserChatInstanceUsage } from '../db/models'
import { getTestUserHeaders } from '../../shared/testData'
import logger from '../util/logger'
import { TEST_COURSES } from '../../shared/testData'
import { headersToUser } from '../middleware/user'

const router = Router()

router.post('/reset-test-data', async (req, res) => {
  if (inProduction) {
    throw ApplicationError.InternalServerError('Cannot call this in production')
  }

  // Reset data of the test user that is mutated in tests
  const testUserIdx = req.body.testUserIdx as string
  const testUserHeaders = getTestUserHeaders(testUserIdx)
  const userId = testUserHeaders.hypersonsisuid

  logger.info('Resetting test data')
  await ChatInstanceRagIndex.destroy({
    where: {
      userId,
    },
  })
  await RagIndex.destroy({
    where: {
      userId,
    },
  })
  await Enrolment.destroy({
    where: {
      userId,
    },
  })
  await UserChatInstanceUsage.destroy({
    where: {
      userId,
    },
  })
  await User.destroy({
    where: {
      id: userId,
    },
  })

  await User.create(headersToUser(testUserHeaders))
  await Enrolment.create({
    userId,
    chatInstanceId: TEST_COURSES.TEST_COURSE.id,
  })

  const [ragIndex] = await RagIndex.findOrCreate({
    where: {
      userId,
    },
    defaults: {
      userId,
      metadata: { ragIndexFilterValue: 'mock', name: `rag-${testUserIdx}`, azureVectorStoreId: 'mock' },
    },
  })
  await ChatInstanceRagIndex.findOrCreate({
    where: {
      userId,
      chatInstanceId: TEST_COURSES.TEST_COURSE.id,
      ragIndexId: ragIndex.id,
    },
    defaults: {
      chatInstanceId: TEST_COURSES.TEST_COURSE.id,
      ragIndexId: ragIndex.id,
      userId,
    },
  })
  logger.info('Test data reset successfully')

  res.status(200).json({ message: 'Test data reset successfully' })
})

export default router
