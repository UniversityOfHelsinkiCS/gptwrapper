import express from 'express'
import cors from 'cors'

import { ChatRequest } from './types'
import shibbolethMiddleware from './middleware/shibboleth'
import userMiddleware from './middleware/user'
import accessLogger from './middleware/access'
import { Service } from './db/models'
import { isError } from './util/parser'
import checkEnrolment from './services/enrolment'
import { checkUsage, decrementUsage } from './services/usage'
import { createCompletion } from './util/openai'

const router = express()

router.use(cors())
router.use(express.json())

router.use(shibbolethMiddleware)
router.use(userMiddleware)

router.use(accessLogger)

router.get('/ping', (_, res) => res.send('pong'))

router.post('/v0/chat', async (req, res) => {
  const request = req as ChatRequest
  const { id, options } = request.body
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')
  if (!id) return res.status(400).send('Missing id')
  if (!options) return res.status(400).send('Missing options')
  if (options.stream) return res.status(406).send('Stream not supported')

  const service = await Service.findByPk(id)
  if (!service) return res.status(404).send('Service not found')

  if (service.courseRealisationId) {
    const hasEnrolment = await checkEnrolment(user, service.courseRealisationId)
    if (!hasEnrolment) return res.status(403).send('Course enrolment required')
  }

  const usageAllowed = await checkUsage(user, service)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  const response = await createCompletion(options)

  if (isError(response)) {
    decrementUsage(user, id)
    return res.status(424).send(response)
  }

  return res.send(response)
})

export default router
