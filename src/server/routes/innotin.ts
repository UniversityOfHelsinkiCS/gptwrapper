import express from 'express'

import { AzureOptions } from '../types'
import { isError } from '../util/parser'
import { calculateUsage } from '../chatInstances/usage'
import { getCompletionEvents, streamCompletion } from '../util/azure'
import { getMessageContext, getModelContextLimit } from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'
import { CURRE_API_PASSWORD } from '../util/config'

const innotinRouter = express.Router()

innotinRouter.post('/stream', async (req, res) => {
  const { options } = req.body
  const { model, CURRE_API_PASSWORD_INNOTIN } = options

  if (!CURRE_API_PASSWORD_INNOTIN || !CURRE_API_PASSWORD) {
    return res.status(500).send('Internal Server Error')
  }
  if (CURRE_API_PASSWORD_INNOTIN !== CURRE_API_PASSWORD) {
    return res.status(401).send('Unauthorized')
  }
  options.messages = getMessageContext(options.messages)
  options.stream = true
  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  encoding.free()

  return res.end()
})

export default innotinRouter
