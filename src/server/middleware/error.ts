import * as Sentry from '@sentry/node'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod/v4'
import logger from '../util/logger'
import { ApplicationError } from '../util/ApplicationError'

const fromMulterError = (error: multer.MulterError): ApplicationError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ApplicationError('The uploaded file is too large.', 413, { silenced: true })
  }
  if (error.code === 'LIMIT_FIELD_VALUE') {
    return new ApplicationError('The file content is too large to send. Please use a smaller file.', 413, { silenced: true })
  }
  return new ApplicationError('There was a problem uploading the file.', 400, { silenced: true })
}

const fromZodError = (error: z.ZodError): ApplicationError => {
  const message = error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message)).join('; ')
  return new ApplicationError(message, 400, { silenced: true, extra: { issues: error.issues } })
}

const errorHandler = (error: Error, _req: Request, res: Response, next: NextFunction) => {
  let normalizedError: ApplicationError
  if (error instanceof ApplicationError) {
    normalizedError = error
  } else if (error instanceof multer.MulterError) {
    normalizedError = fromMulterError(error)
  } else if (error instanceof z.ZodError) {
    normalizedError = fromZodError(error)
  } else {
    normalizedError = new ApplicationError(error.message)
  }

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
