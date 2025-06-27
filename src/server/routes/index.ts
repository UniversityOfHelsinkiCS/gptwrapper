import express from 'express'
import cors from 'cors'
import * as Sentry from '@sentry/node'

import shibbolethMiddleware from '../middleware/shibboleth'
import userMiddleware from '../middleware/user'
import initializeSentry from '../util/sentry'
import errorHandler from '../middleware/error'
import accessLogger from '../middleware/access'
import openaiRouter from './openai'
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

const router = express()

initializeSentry()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => {
  res.send('pong')
})

router.use('/ai', openaiRouter)
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

Sentry.setupExpressErrorHandler(router)
router.use(errorHandler)

export default router
