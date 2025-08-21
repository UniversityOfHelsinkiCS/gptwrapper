import { Router } from 'express'
import { ToolResultStore } from '../../services/langchain/fileSearchResultsStore'
import type { RequestWithUser } from '../../types'

const router = Router()

router.get('/:toolResultId', async (req, res) => {
  const { toolResultId } = req.params
  const { user } = req as unknown as RequestWithUser

  const results = await ToolResultStore.getResults(toolResultId, user)

  if (!results) {
    res.json({ expired: true })
    return
  }

  res.json(results)
})

export default router
