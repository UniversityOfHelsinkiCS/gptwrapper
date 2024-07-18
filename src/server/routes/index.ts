import express from 'express'
import cors from 'cors'
import * as Sentry from '@sentry/node'

import userMiddleware from '../middleware/user'
import initializeSentry from '../util/sentry'
import errorHandler from '../middleware/error'
import accessLogger from '../middleware/access'
import openaiRouter from './openai'
import usersRouter from './users'
import chatInstancesRouter from './chatInstance'
import courseRouter from './course'
import promptRouter from './prompt'
import emailRouter from './email'
import adminRouter from './admin'
import facultyRouter from './faculty'
import { inCI, inDevelopment } from '../../config'

const router = express()

initializeSentry()

router.use(cors())
router.use(express.json())

if (inDevelopment || inCI) router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => res.send('pong'))

router.use('/ai', openaiRouter)
router.use('/users', usersRouter)
router.use('/chatinstances', chatInstancesRouter)
router.use('/courses', courseRouter)
router.use('/prompts', promptRouter)
router.use('/email', emailRouter)
router.use('/admin', adminRouter)
router.use('/faculties', facultyRouter)

Sentry.setupExpressErrorHandler(router)
router.use(errorHandler)

export default router
