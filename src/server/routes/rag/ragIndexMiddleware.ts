import { type NextFunction, type Request, type Response } from 'express'
import type { RequestWithUser } from '../../types'
import { ChatInstance, RagIndex, Responsibility } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'

import z from 'zod/v4'

export interface RagIndexRequest extends RequestWithUser {
  ragIndex: RagIndex
  uploadedS3Keys?: string[]
}

const RagIndexIdSchema = z.object({
  ragIndexId: z.coerce.number().min(1),
})
/**
 * Middleware to load the RagIndex from the request parameters.
 * And authorize the user.
 */
export async function ragIndexMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqWithUser = req as RequestWithUser
  const user = reqWithUser.user
  const { ragIndexId } = RagIndexIdSchema.parse(req.params)
  const [responsibilities, ragIndex] = await Promise.all([
    Responsibility.findAll({
      where: { userId: user.id },
    }),
    RagIndex.findByPk(ragIndexId, {
      include: { model: ChatInstance, as: 'chatInstances' },
    }),
  ])

  if (!ragIndex) {
    throw ApplicationError.NotFound('RagIndex not found')
  }

  const isResponsible = responsibilities.some((r) => ragIndex.chatInstances?.some((ci) => ci.id === r.chatInstanceId))

  // V2 user indices are personal (no chatInstance), so the owner always has access.
  const isOwner = ragIndex.userId === user.id

  // Check that user is admin, the owner, or responsible for this chatInstance
  if (!isResponsible && !isOwner && !user.isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const ragIndexRequest = reqWithUser as RagIndexRequest
  ragIndexRequest.ragIndex = ragIndex

  next()
}
