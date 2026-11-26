import express from 'express'
import cors from 'cors'
import * as Sentry from '@sentry/node'

import shibbolethMiddleware from '../middleware/shibboleth'
import userMiddleware from '../middleware/user'
import initializeSentry from '../util/sentry'
import errorHandler from '../middleware/error'
import requestLogger from '../middleware/requestLogger'
import aiRouter from './ai'
import ragRouter from './rag'
import userRouter from './user'
import chatInstancesRouter from './chatInstance'
import courseRouter from './course'
import promptRouter from './prompt'
import emailRouter from './email'
import adminRouter from './admin'
import feedbackRouter from './feedback'
import notificationRouter from './notifications'
import changelogRouter from './changelog'
import uniPromptRouter from './uniPrompt'
import testUtilsRouter from './testUtils'
import apiKeyRouter from './apiKey'
import toolsRouter from './tools'
import { inProduction } from '../../config'
import logger from '../util/logger'
import statisticsRouter from './statistics'
import analyticsRouter from './analytics'
import { api as externalAPI } from './ai/openai'

const router = express()

initializeSentry()

router.use(cors())
router.use(express.json({ limit: '10mb' }))
router.use(express.urlencoded({ limit: '10mb' }))

// This uses API-key based authentication so shibboleth is not needed
router.use('/external', externalAPI)

router.use(shibbolethMiddleware)
router.use(userMiddleware)

// Mounted before requestLogger on purpose: the access log line carries the uid and a referrer with the course id,
// and a feature event must stay anonymous (one FeatureEvent line only).
router.use('/analytics', analyticsRouter)

router.use(requestLogger)

if (!inProduction) {
  logger.info('Test router initialized')
  router.use('/test', testUtilsRouter)
}

router.get('/ping', (_, res) => {
  res.send('pong')
})

router.use('/ai', aiRouter)
router.use('/rag', ragRouter)
router.use('/users', userRouter)
router.use('/chatinstances', chatInstancesRouter)
router.use('/courses', courseRouter)
router.use('/prompts', promptRouter)
router.use('/email', emailRouter)
router.use('/admin', adminRouter)
router.use('/statistics', statisticsRouter)
router.use('/feedback', feedbackRouter)
router.use('/notifications', notificationRouter)
router.use('/changelog', changelogRouter)
router.use('/uniprompts', uniPromptRouter)
router.use('/apikeys', apiKeyRouter)
router.use('/tools', toolsRouter)

Sentry.setupExpressErrorHandler(router)
router.use(errorHandler)

export default router
