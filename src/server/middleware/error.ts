import * as Sentry from '@sentry/node'
import type { NextFunction, Request, Response } from 'express'
import logger from '../util/logger'
import { ApplicationError } from '../util/ApplicationError'

const errorHandler = (error: Error, _req: Request, res: Response, next: NextFunction) => {
  logger.error(`${error.message} ${error.name} ${error.stack}`)

  Sentry.captureException(error)

  if (res.headersSent) {
    next(error)
    return
  }

  const normalizedError = error instanceof ApplicationError ? error : new ApplicationError(error.message)

  res.status(normalizedError.status).json(normalizedError)
}

export default errorHandler
