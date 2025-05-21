import { NextFunction, Request, Response, Router } from 'express'
import { EMBED_DIM, EMBED_MODEL } from '../../config'
import { createChunkIndex, deleteChunkIndex, getNumberOfChunks } from '../services/rag/chunkDb'
import { RagIndex } from '../db/models'
import { RequestWithUser } from '../types'
import z from 'zod'
import { queryRagIndex } from '../services/rag/query'
import { ingestionPipeline } from '../services/rag/ingestion/pipeline'
import { getAzureOpenAIClient } from '../util/azure'
import multer from 'multer'
import { mkdir, rm, stat } from 'fs/promises'

const router = Router()

const UPLOAD_DIR = 'uploads/rag'

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

  // Create upload directory for this index

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

  const uploadPath = `${UPLOAD_DIR}/${id}`
  try {
    await rm(uploadPath, { recursive: true, force: true })
    console.log(`Upload directory ${uploadPath} deleted`)
  } catch (error) {
    console.warn(`Upload directory ${uploadPath} not found, nothing to delete --- `, error)
  }

  await ragIndex.destroy()

  res.json({ message: 'Index deleted' })
})

router.get('/indices', async (_req, res) => {
  const indices = await RagIndex.findAll()

  const indicesWithMetadata = await Promise.all(
    indices.map(async (index) => {
      const numOfChunks = await getNumberOfChunks(index)

      return {
        ...index.toJSON(),
        numOfChunks,
      }
    }),
  )

  res.json(indicesWithMetadata)
})

const IndexIdSchema = z.coerce.number().min(1)

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const id = IndexIdSchema.parse(req.params.id)
      const uploadPath = `${UPLOAD_DIR}/${id}`
      cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
      const uniqueFilename = file.originalname
      cb(null, uniqueFilename)
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
})
const uploadMiddleware = upload.array('files')

const indexUploadDirMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const id = IndexIdSchema.parse(req.params.id)
  const uploadPath = `${UPLOAD_DIR}/${id}`
  try {
    await stat(uploadPath)
  } catch (_error) {
    console.warn(`RAG upload dir not found, creating ${uploadPath} --- `)
    await mkdir(uploadPath, { recursive: true })
  }
  next()
}

router.put('/indices/:id/upload', [indexUploadDirMiddleware, uploadMiddleware], async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const id = IndexIdSchema.parse(req.params.id)

  const ragIndex = await RagIndex.findOne({
    where: { id, userId: user.id },
  })
  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  if (!req.files || req.files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' })
    return
  }

  const openAiClient = getAzureOpenAIClient(EMBED_MODEL)

  await ingestionPipeline(openAiClient, `uploads/rag/${id}`, ragIndex)

  res.json({ message: 'Files uploaded and processed' })
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
