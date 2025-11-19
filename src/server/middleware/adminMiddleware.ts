import { NextFunction, Request, Response } from 'express'
import { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req as RequestWithUser
  if (user.isAdmin) {
    next()
  }
  throw ApplicationError.Forbidden()
}
