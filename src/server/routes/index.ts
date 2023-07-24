import express from 'express'
import cors from 'cors'

import shibbolethMiddleware from '../middleware/shibboleth'
import userMiddleware from '../middleware/user'
import accessLogger from '../middleware/access'
import openaiRouter from './openai'
import userRouter from './user'
import emailRouter from './email'

const router = express()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => res.send('pong'))

router.use('/ai', openaiRouter)
router.use('/users', userRouter)
router.use('/email', emailRouter)

export default router
