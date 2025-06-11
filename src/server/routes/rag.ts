import fs from 'fs'
import { NextFunction, Request, Response, Router } from 'express'
import { EMBED_DIM } from '../../config'
import { ChatInstance, RagFile, RagIndex, Responsibility } from '../db/models'
import { RequestWithUser } from '../types'
import z from 'zod'
import multer from 'multer'
import { mkdir, rm, stat } from 'fs/promises'
import { getAzureOpenAIClient } from '../util/azure/client'

const router = Router()

router.use((req, res, next) => {
  const { user } = req as RequestWithUser
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
})

const UPLOAD_DIR = 'uploads/rag'

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  courseId: z.string().min(1).max(100),
  dim: z.number().min(EMBED_DIM).max(EMBED_DIM).default(EMBED_DIM),
})

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, dim, courseId } = IndexCreationSchema.parse(req.body)

  const course = await ChatInstance.findOne({
    where: { courseId },
    include: {
      model: Responsibility,
      as: 'responsibilities',
      required: true, // Ensure the user is responsible for the course
    },
  })

  if (!course) {
    res.status(404).json({ error: 'Course not found or you are not responsible for this course' })
    return
  }

  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.create({
    name,
  })

  const ragIndex = await RagIndex.create({
    userId: user.id,
    courseId,
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
  const { id } = req.params

  const ragIndex = await RagIndex.findOne({
    where: { id },
  })

  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  const client = getAzureOpenAIClient()
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

const GetIndicesQuerySchema = z.object({
  courseId: z.string().optional(),
  includeExtras: z
    .string()
    .toLowerCase()
    .transform((x) => x === 'true')
    .pipe(z.boolean()),
})

router.get('/indices', async (req, res) => {
  const { courseId, includeExtras } = GetIndicesQuerySchema.parse(req.query)

  const indices = await RagIndex.findAll({
    ...(courseId ? { where: { courseId } } : {}),
    include: [
      {
        model: RagFile,
        as: 'ragFiles',
        attributes: ['id', 'filename'],
      },
    ],
  })

  if (includeExtras) {
    const client = getAzureOpenAIClient()

    // Add ragFileCount to each index
    const indicesWithCount = await Promise.all(
      indices.map(async (index: any) => {
        const vectorStore = await client.vectorStores.retrieve(index.metadata.azureVectorStoreId)
        const count = await RagFile.count({ where: { ragIndexId: index.id } })
        return { ...index.toJSON(), ragFileCount: count, vectorStore }
      }),
    )

    res.json(indicesWithCount)
    return
  }

  res.json(indices)
})

const IndexIdSchema = z.coerce.number().min(1)

router.get('/indices/:id', async (req, res) => {
  const id = IndexIdSchema.parse(req.params.id)

  const ragIndex = await RagIndex.findOne({
    where: { id },
    include: {
      model: RagFile,
      as: 'ragFiles',
    },
  })

  if (!ragIndex) {
    res.status(404).json({ error: 'Index not found' })
    return
  }

  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.retrieve(ragIndex.metadata.azureVectorStoreId)

  res.json({
    ...ragIndex.toJSON(),
    vectorStore,
  })
})

router.get('/indices/:id/files/:fileId', async (req, res) => {
  const indexId = IndexIdSchema.parse(req.params.id)
  const fileId = IndexIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId },
    include: {
      model: RagIndex,
      as: 'ragIndex',
      where: { id: indexId },
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

router.delete('/indices/:id/files/:fileId', async (req, res) => {
  const indexId = IndexIdSchema.parse(req.params.id)
  const fileId = IndexIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId },
    include: {
      model: RagIndex,
      as: 'ragIndex',
      where: { id: indexId },
    },
  })

  if (!ragFile) {
    res.status(404).json({ error: 'File not found' })
    return
  }

  await RagFile.update(
    { pipelineStage: 'deleting' },
    {
      where: { id: ragFile.id },
    },
  )

  // Delete file from disk
  const filePath = `${UPLOAD_DIR}/${indexId}/${ragFile.filename}`
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error)
    res.status(500).json({ error: 'Failed to delete file' })
    return
  }

  // Delete from vector store
  const client = getAzureOpenAIClient()
  try {
    await client.vectorStores.files.del(ragFile.ragIndex.metadata.azureVectorStoreId, ragFile.metadata.vectorStoreFileId)
  } catch (error) {
    console.error(`Failed to delete file from Azure vector store:`, error)
    res.status(500).json({ error: 'Failed to delete file from vector store' })
    return
  }

  // Delete RagFile record
  await ragFile.destroy()
  res.json({ message: 'File deleted successfully' })
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
    where: { id },
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

  const client = getAzureOpenAIClient()

  const uploadDirPath = `${UPLOAD_DIR}/${id}`

  await Promise.all(
    ragFiles.map(async (ragFile) => {
      const filePath = `${uploadDirPath}/${ragFile.filename}`
      const stream = fs.createReadStream(filePath)
      const vectorStoreFile = await client.vectorStores.files.upload(ragIndex.metadata.azureVectorStoreId, stream)
      console.log(`File ${filePath} uploaded to vector store`)
      await RagFile.update(
        {
          pipelineStage: 'completed',
          metadata: {
            chunkingStrategy: vectorStoreFile.chunking_strategy.type,
            usageBytes: vectorStoreFile.usage_bytes,
            vectorStoreFileId: vectorStoreFile.id,
          },
        },
        {
          where: { id: ragFile.id },
        },
      )
    }),
  )

  res.json({ message: 'Files uploaded successfully' })
})

router.delete('/files/:id', async (req, res) => {
  const { id } = req.params
  const ragFile = await RagFile.findOne({
    where: { id },
  })
  if (!ragFile) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  await ragFile.destroy()
  res.json({ message: 'File deleted' })
})

export default router
