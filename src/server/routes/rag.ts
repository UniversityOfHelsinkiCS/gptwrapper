import { Router } from 'express'
import { searchRag } from '../util/rag'

const router = Router()

router.post('/query/*', async (req, res) => {
  const prompt = req.body.prompt
  const answer = await searchRag(prompt)
  res.json(answer)
})

export default router
