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
import facultyRouter from './faculty'
import infoTextRouter from './infotext'
import changeLogRouter from './changeLog'
import feedbackRouter from './feedback'
import testUtilsRouter from './testUtils'
import { inProduction } from '../../config'
import logger from '../util/logger'

const router = express()

initializeSentry()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

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
router.use('/faculties', facultyRouter)
router.use('/infotexts', infoTextRouter)
router.use('/changelog', changeLogRouter)
router.use('/feedback', feedbackRouter)

Sentry.setupExpressErrorHandler(router)
router.use(errorHandler)

export default router
