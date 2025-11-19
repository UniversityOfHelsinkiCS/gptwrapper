import { NextFunction, Request, Response } from 'express'
import { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'
import logger from '../util/logger'

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req as RequestWithUser
  if (user.isAdmin) {
    next()
    return
  }
  throw ApplicationError.Forbidden()
}
