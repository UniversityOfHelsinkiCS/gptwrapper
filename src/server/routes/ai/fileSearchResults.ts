import { Router } from 'express'
import { FileSearchResultsStore } from '../../services/azureFileSearch/fileSearchResultsStore'
import type { RequestWithUser } from '../../types'

const router = Router()

router.get('/:fileSearchId', async (req, res) => {
  const { fileSearchId } = req.params
  const { user } = req as unknown as RequestWithUser

  const results = await FileSearchResultsStore.getResults(fileSearchId, user)

  if (!results) {
    res.json({ expired: true })
    return
  }

  res.json(results)
})

export default router
