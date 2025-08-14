import { Router } from 'express'
import { inProduction } from '../../config'
import { ApplicationError } from '../util/ApplicationError'
import { ChatInstanceRagIndex, Enrolment, Prompt, RagIndex, User, UserChatInstanceUsage } from '../db/models'
import { getTestUserHeaders } from '../../shared/testData'
import logger from '../util/logger'
import { TEST_COURSES } from '../../shared/testData'
import { headersToUser } from '../middleware/user'
import { ResponsesClient } from '../util/azure/ResponsesAPI'
import { RequestWithUser } from '../types'
import getEncoding from '../util/tiktoken'
import { getCompletionEvents } from '../util/azure/client'

const router = Router()

router.post('/reset-test-data', async (req, res) => {
  if (inProduction) {
    throw ApplicationError.InternalServerError('Cannot call this in production')
  }

  // Reset data of the test user that is mutated in tests
  const testUserIdx = req.body.testUserIdx as string
  const testUserHeaders = getTestUserHeaders(testUserIdx)
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

router.post('/responses-api', async (req, res) => {
  const { user } = req as RequestWithUser

  const encoding = getEncoding('gpt-4o-mini')

  const responsesClient = new ResponsesClient({
    model: 'gpt-4o-mini',
    ragIndex: undefined,
    instructions: '',
    temperature: 0.9,
    user,
  })

  console.log('Starting Responses API stream')

  const stream = await responsesClient.createResponse({
    input: {
      role: 'user',
      content: 'Hello!, please explain the concept of artificial intelligence.',
    },
  })

  console.log('Stream Responses API started')

  const result = await responsesClient.handleResponse({ stream, encoding, res })

  console.log('Stream Responses API ended', result)
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
    model: 'gpt-4o-mini',
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
