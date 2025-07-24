import morgan from 'morgan'

import { inProduction, inStaging } from '../../config'
import logger from '../util/logger'
import type { Response } from 'express'

// Morgan excepts a log format string to be returned, but here a separate logger is used instead.
// Override the first function argument to return void instead of a string.
type Morgan = typeof morgan
type ReturnVoid = (...args: Parameters<Parameters<Morgan>[0]>) => void
type AccessLogger = (arg0: ReturnVoid) => ReturnType<Morgan>

const requestMorganLogger = morgan as unknown as AccessLogger

const requestLogger = requestMorganLogger((tokens, req, res) => {
  const { uid } = req.headers

  const method = tokens.method(req, res)
  const url = tokens.url(req, res)
  const status = tokens.status(req, res)
  const responseTime = tokens['response-time'](req, res)
  const userAgent = tokens['user-agent'](req, res)

  const message = `${method} ${url} ${status} - ${responseTime} ms`

  let additionalInfo =
    inProduction || inStaging
      ? {
          userId: uid,
          method,
          referrer: req.headers.referer,
          url,
          status,
          responseTime,
          userAgent,
        }
      : {}

  if ((res as Response).locals.chatCompletionMeta) {
    additionalInfo = {
      ...additionalInfo,
      ...((res as Response).locals.chatCompletionMeta as Record<string, unknown>),
    }
  }

  logger.info(message, additionalInfo)
})

export default requestLogger
