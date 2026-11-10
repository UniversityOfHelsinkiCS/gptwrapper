import express from 'express'
import { listAddableTools } from '../services/agent/tools/promptTools'
import type { RequestWithUser } from '../types'

const toolsRouter = express.Router()

/** The tools the current user can add to a prompt: `stable` ones for everyone, `experimental` ones for admins too. */
toolsRouter.get('/', (req, res) => {
  const { user } = req as RequestWithUser
  res.send(listAddableTools(user))
})

export default toolsRouter
