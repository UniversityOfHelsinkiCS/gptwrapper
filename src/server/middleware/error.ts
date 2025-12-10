import * as Sentry from '@sentry/node'
import type { NextFunction, Request, Response } from 'express'
import type { MulterError } from 'multer'
import logger from '../util/logger'
import { ApplicationError } from '../util/ApplicationError'

const errorHandler = (error: Error | MulterError, _req: Request, res: Response, next: NextFunction) => {
  // Handle Multer-specific errors
  if (error && 'code' in error) {
    const multerError = error as MulterError
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      const normalizedError = ApplicationError.BadRequest('File size exceeds the maximum limit of 50MB')
      logger.error(`${multerError.message} ${multerError.code}`)
      res.status(normalizedError.status).json(normalizedError)
      return
    }
    if (multerError.code === 'LIMIT_FILE_COUNT' || multerError.code === 'LIMIT_UNEXPECTED_FILE') {
      const normalizedError = ApplicationError.BadRequest(multerError.message)
      logger.error(`${multerError.message} ${multerError.code}`)
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
