import { Router } from 'express'
import { inProduction } from '../../config'
import { ApplicationError } from '../util/ApplicationError'
import { User, UserChatInstanceUsage } from '../db/models'
import { getTestUserHeaders } from '../../shared/testData'
import logger from '../util/logger'

const router = Router()

router.post('/reset-test-data', async (req, res) => {
  if (inProduction) {
    throw ApplicationError.InternalServerError('Cannot call this in production')
  }

  // Reset data of the test user that is mutated in tests
  const testUserIdx = req.body.testUserIdx as string
  const testUserHeaders = getTestUserHeaders(testUserIdx)

  logger.info('Resetting test data')
  await UserChatInstanceUsage.destroy({
    where: {
      userId: testUserHeaders.hypersonsisuid,
    },
  })
  await User.destroy({
    where: {
      id: testUserHeaders.hypersonsisuid,
    },
  })
  logger.info('Test data reset successfully')

  res.status(200).json({ message: 'Test data reset successfully' })
})

export default router
