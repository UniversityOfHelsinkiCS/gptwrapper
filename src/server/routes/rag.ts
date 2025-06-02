import fs from 'fs'
import { NextFunction, Request, Response, Router } from 'express'
import { EMBED_DIM } from '../../config'
import { RagFile, RagIndex } from '../db/models'
import { RequestWithUser } from '../types'
import z from 'zod'
import { queryRagIndex } from '../services/rag/query'
import multer from 'multer'
import { mkdir, rm, stat } from 'fs/promises'
import { getAzureOpenAIClient } from '../util/azure/client'

const router = Router()

const UPLOAD_DIR = 'uploads/rag'

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  dim: z.number().min(EMBED_DIM).max(EMBED_DIM).default(EMBED_DIM),
})

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, dim } = IndexCreationSchema.parse(req.body)

  const client = getAzureOpenAIClient('curredev4omini')
  const vectorStore = await client.vectorStores.create({
    name,
  })

  const ragIndex = await RagIndex.create({
    userId: user.id,
    metadata: {
      name,
      dim,
      azureVectorStoreId: vectorStore.id,
    },
  })

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

  const client = getAzureOpenAIClient('curredev4omini')
  try {
    await client.vectorStores.del(ragIndex.metadata.azureVectorStoreId)
  } catch (error) {
    console.error(`Failed to delete Azure vector store ${ragIndex.metadata.azureVectorStoreId}:`, error)
    res.status(500).json({ error: 'Failed to delete Azure vector store' })
    return
  }

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

  const client = getAzureOpenAIClient('curredev4omini')

  // Add ragFileCount to each index
  const indicesWithCount = await Promise.all(
    indices.map(async (index: any) => {
      const vectorStore = await client.vectorStores.retrieve(index.metadata.azureVectorStoreId)
      const count = await RagFile.count({ where: { ragIndexId: index.id } })
      return { ...index.toJSON(), ragFileCount: count, vectorStore }
    }),
  )

  res.json(indicesWithCount)
})

const IndexIdSchema = z.coerce.number().min(1)

router.get('/indices/:id', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const id = IndexIdSchema.parse(req.params.id)

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

  const client = getAzureOpenAIClient('curredev4omini')
  const vectorStore = await client.vectorStores.retrieve(ragIndex.metadata.azureVectorStoreId)

  res.json({
    ...ragIndex.toJSON(),
    vectorStore,
  })
})

router.get('/indices/:id/files/:fileId', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const indexId = IndexIdSchema.parse(req.params.id)
  const fileId = IndexIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId },
    include: {
      model: RagIndex,
      as: 'ragIndex',
      where: { id: indexId, userId: user.id },
    },
  })

  if (!ragFile) {
    res.status(404).json({ error: 'File not found' })
    return
  }

  // Read file content
  const filePath = `${UPLOAD_DIR}/${indexId}/${ragFile.filename}`
  let fileContent: string
  try {
    fileContent = await fs.promises.readFile(filePath, 'utf-8')
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error)
    res.status(500).json({ error: 'Failed to read file content' })
    return
  }

  res.json({
    ...ragFile.toJSON(),
    fileContent,
  })
})

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
    console.log(`RAG upload dir exists: ${uploadPath}`)
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

  const ragFiles: RagFile[] = await Promise.all(
    req.files.map((file: Express.Multer.File) =>
      RagFile.create({
        userId: user.id,
        ragIndexId: ragIndex.id,
        pipelineStage: 'upload',
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        metadata: {},
      }),
    ),
  )

  const client = getAzureOpenAIClient('curredev4omini')

  const uploadDirPath = `${UPLOAD_DIR}/${id}`

  const fileStreams = req.files.map((file: Express.Multer.File) => {
    const filePath = `${uploadDirPath}/${file.originalname}`
    return fs.createReadStream(filePath)
  })

  const fileBatchRes = await client.vectorStores.fileBatches.uploadAndPoll(ragIndex.metadata.azureVectorStoreId, {
    files: fileStreams,
  })

  console.log('File batch upload response:', fileBatchRes)

  await Promise.all(
    ragFiles.map(async (ragFile) =>
      ragFile.update({
        pipelineStage: 'completed',
      }),
    ),
  )

  res.json({ message: 'Files uploaded successfully' })
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
