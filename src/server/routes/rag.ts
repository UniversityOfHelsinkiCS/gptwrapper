import { Router } from 'express'
import { EMBED_DIM } from '../../config'
import { createChunkIndex, deleteChunkIndex } from '../services/rag/chunkDb'
import { RagIndex } from '../db/models'
import { RequestWithUser } from '../types'
import z from 'zod'
import { queryRagIndex } from '../services/rag/query'

const router = Router()

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  dim: z.number().min(1024).max(1024).default(EMBED_DIM),
})

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, dim } = IndexCreationSchema.parse(req.body)

  const ragIndex = await RagIndex.create({
    userId: user.id,
    metadata: {
      name,
      dim,
    },
  })

  await createChunkIndex(ragIndex)

  res.json(ragIndex)
})

router.delete('/indices/:id', async (req, res) => {
  const { user } = req as unknown as RequestWithUser // <- fix type
  const { id } = req.params

  const ragIndex = await RagIndex.findOne({
    where: { id, userId: user.id },
  })

  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  await deleteChunkIndex(ragIndex)

  await ragIndex.destroy()

  res.json({ message: 'Index deleted' })
})

router.get('/indices', async (_req, res) => {
  const indices = await RagIndex.findAll()

  res.json(indices)
})

const RagIndexQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().min(1).max(100).default(5),
  indexId: z.number(),
})
router.post('/query', async (req, res) => {
  const { query, topK, indexId } = RagIndexQuerySchema.parse(req.body)

  const ragIndex = await RagIndex.findByPk(indexId)

  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  const results = await queryRagIndex(ragIndex, query, topK)
  res.json(results)
})

export default router
