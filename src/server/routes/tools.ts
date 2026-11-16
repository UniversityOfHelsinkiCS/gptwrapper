import express from 'express'
import { listAddableTools } from '../services/agent/tools/promptTools'
import type { RequestWithUser } from '../types'

const toolsRouter = express.Router()

/** The tools the current user can add to a prompt: `everyone` tools for all, `admin` tools for admins too. */
toolsRouter.get('/', (req, res) => {
  const { user } = req as RequestWithUser
  res.send(listAddableTools(user))
})

export default toolsRouter
