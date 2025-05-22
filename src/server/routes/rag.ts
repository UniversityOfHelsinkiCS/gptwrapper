import { NextFunction, Request, Response, Router } from 'express'
import { EMBED_DIM } from '../../config'
import { createChunkIndex, deleteChunkIndex } from '../services/rag/chunkDb'
import { RagFile, RagIndex } from '../db/models'
import { RequestWithUser } from '../types'
import z from 'zod'
import { queryRagIndex } from '../services/rag/query'
import { ingestionPipeline } from '../services/rag/ingestion/pipeline'
import multer from 'multer'
import { mkdir, rm, stat } from 'fs/promises'
import { getOllamaOpenAIClient } from '../util/ollama'

const router = Router()

const UPLOAD_DIR = 'uploads/rag'

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  dim: z.number().min(EMBED_DIM).max(EMBED_DIM).default(EMBED_DIM),
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

  await ragIndex.destroy() // Cascade deletes RagFiles

  res.json({ message: 'Index deleted' })
})

router.get('/indices', async (_req, res) => {
  const indices = await RagIndex.findAll({
    include: [
      {
        model: RagFile,
        as: 'ragFiles',
        attributes: ['id'],
      },
    ],
  })

  // Add ragFileCount to each index
  const indicesWithCount = await Promise.all(
    indices.map(async (index: any) => {
      const count = await RagFile.count({ where: { ragIndexId: index.id } })
      return { ...index.toJSON(), ragFileCount: count }
    }),
  )

  res.json(indicesWithCount)
})

router.get('/indices/:id', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const { id } = req.params

  const ragIndex = await RagIndex.findOne({
    where: { id, userId: user.id },
    include: {
      model: RagFile,
      as: 'ragFiles',
    },
  })

  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  res.json(ragIndex)
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
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
})
const uploadMiddleware = upload.array('files')

const indexUploadDirMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const id = IndexIdSchema.parse(req.params.id)
  const uploadPath = `${UPLOAD_DIR}/${id}`
  try {
    await stat(uploadPath)
    await rm(uploadPath, { recursive: true, force: true })
    console.log(`Upload directory ${uploadPath} deleted`)
    await mkdir(uploadPath, { recursive: true })
  } catch (error) {
    console.warn(`RAG upload dir not found, creating ${uploadPath} --- ${error}`)
    await mkdir(uploadPath, { recursive: true })
  }
  next()
}

router.post('/indices/:id/upload', [indexUploadDirMiddleware, uploadMiddleware], async (req, res) => {
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

  await RagFile.bulkCreate(
    req.files.map((file) => ({
      filename: file.originalname,
      fileType: 'pending',
      fileSize: 0,
      numChunks: 0,
      userId: user.id,
      ragIndexId: ragIndex.id,
      pipelineStage: 'pending',
    })),
  )

  const openAiClient = getOllamaOpenAIClient() // getAzureOpenAIClient(EMBED_MODEL)

  ingestionPipeline(openAiClient, `uploads/rag/${id}`, ragIndex, user)

  res.json({ message: 'Files uploaded successfully, starting ingestion' })
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

router.delete('/files/:id', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const { id } = req.params
  const ragFile = await RagFile.findOne({
    where: { id, userId: user.id },
  })
  if (!ragFile) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  await ragFile.destroy()
  res.json({ message: 'File deleted' })
})

export default router
