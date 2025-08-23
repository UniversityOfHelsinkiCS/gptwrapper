import { Router } from 'express'
import { inProduction } from '../../config'
import { getTestUserHeaders, TEST_COURSES } from '../../shared/testData'
import { ChatInstanceRagIndex, Enrolment, Prompt, RagIndex, User, UserChatInstanceUsage } from '../db/models'
import { headersToUser } from '../middleware/user'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'
import { getCompletionEvents } from '../util/azure/client'
import logger from '../util/logger'
import getEncoding from '../util/tiktoken'

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

  logger.info(`Resetting test data for user ${userId}`)
  await Prompt.destroy({
    where: {
      userId,
    },
  })
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
      metadata: {
        name: `rag-${testUserIdx}`,
        language: 'English',
      },
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

router.post('/completions-api', async (req, res) => {
  console.log('Starting Completions API')

  const result = await getCompletionEvents({
    messages: [
      {
        role: 'user',
        // @ts-expect-error whatever
        content: 'Hello!, please explain the concept of artificial intelligence.',
      },
    ],
    model: 'gpt-4.1',
    options: {
      temperature: 0.9,
    },
  })

  // @ts-expect-error whatever
  for await (const chunk of result) {
    console.log('Completions API chunk:', chunk)
  }

  console.log('Completions API result:', result)
})

export default router
