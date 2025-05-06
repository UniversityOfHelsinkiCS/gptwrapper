import { Router } from 'express'
import { searchRag } from '../util/rag'

const router = Router()

router.post('/query', async (req, res) => {
  console.log('Received request on /rag/query')
  console.log('Request body:', req.body)
  console.log('Request headers:', req.headers)
  console.log('Request method:', req.method)
  try {
    const prompt = req.body.prompt
    const answer = await searchRag(prompt)
    res.json(answer)
  } catch (error) {
    console.error('Error in /rag/query:', error)
    res.status(500).json({ error: 'Rag failed' })
  }
})

export default router
