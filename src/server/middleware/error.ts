import * as Sentry from '@sentry/node'
import type { NextFunction, Request, Response } from 'express'
import logger from '../util/logger'
import { ApplicationError } from '../util/ApplicationError'

const errorHandler = (error: Error, _req: Request, res: Response, next: NextFunction) => {
  // Handle Multer-specific errors
  if (error && 'code' in error && typeof error.code === 'string') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const normalizedError = ApplicationError.BadRequest('File size exceeds the maximum limit of 50MB')
      logger.error(`${error.message} ${error.code}`)
      res.status(normalizedError.status).json(normalizedError)
      return
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      const normalizedError = ApplicationError.BadRequest(error.message)
      logger.error(`${error.message} ${error.code}`)
      res.status(normalizedError.status).json(normalizedError)
      return
    }
  }

  const normalizedError = error instanceof ApplicationError ? error : new ApplicationError(error.message)

  if (!normalizedError.silenced) {
    logger.error(`${error.message} ${error.name} ${error.stack}`)
    Sentry.captureException(error)
  }

  if (res.headersSent) {
    next(error)
    return
  }

  res.status(normalizedError.status).json(normalizedError)
}

export default errorHandler
