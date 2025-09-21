import { type NextFunction, type Request, type Response, Router } from 'express'
import multer from 'multer'
import z from 'zod/v4'
import multerS3 from 'multer-s3'
import { shouldRenderAsText } from '../../../shared/utils'
import { ChatInstance, RagFile, RagIndex, Responsibility } from '../../db/models'
import { FileStore } from '../../services/rag/fileStore'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import { search } from '../../services/rag/search'
import { getRedisVectorStore } from '../../services/rag/vectorStore'
import { SearchSchema } from '../../../shared/rag'
import { S3_BUCKET } from '../../util/config'
import { s3Client } from '../../util/s3client'
import { ingestRagFiles } from '../../services/rag/ingestion'

const ragIndexRouter = Router()

interface RagIndexRequest extends RequestWithUser {
  ragIndex: RagIndex
}

const RagIndexIdSchema = z.object({
  ragIndexId: z.coerce.number().min(1),
})

/**
 * Middleware to load the RagIndex from the request parameters.
 * And authorize the user.
 */
export async function ragIndexMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqWithUser = req as RequestWithUser
  const user = reqWithUser.user
  const { ragIndexId } = RagIndexIdSchema.parse(req.params)
  const responsibilities = await Responsibility.findAll({
    where: { userId: user.id },
  })
  const ragIndex = await RagIndex.findByPk(ragIndexId, {
    include: { model: ChatInstance, as: 'chatInstances' },
  })

  if (!ragIndex) {
    throw ApplicationError.NotFound('RagIndex not found')
  }

  const isResponsible = responsibilities.some((r) => ragIndex.chatInstances?.some((ci) => ci.id === r.chatInstanceId))

  // Check that user is admin or responsible for this chatInstance
  if (!isResponsible && !user.isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const ragIndexRequest = reqWithUser as RagIndexRequest
  ragIndexRequest.ragIndex = ragIndex

  next()
}

ragIndexRouter.delete('/', async (req, res) => {
  const ragIndexRequest = req as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex

  await FileStore.deleteRagIndexDocuments(ragIndex)

  const vectorStore = getRedisVectorStore(ragIndex.id)

  await vectorStore.dropIndex(true)

  await ragIndex.destroy() // Cascade deletes RagFiles

  res.json({ message: 'Index deleted' })
})

ragIndexRouter.get('/', async (req, res) => {
  const ragIndexRequest = req as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex

  const ragFiles = await RagFile.findAll({
    where: { ragIndexId: ragIndex.id },
  })

  /* @todo langchain impl
  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.retrieve(ragIndex.metadata.azureVectorStoreId)
  */

  res.json({
    ...ragIndex.toJSON(),
    ragFiles: ragFiles.map((file) => file.toJSON()),
    // vectorStore,
  })
})

const RagFileIdSchema = z.coerce.number().min(1)

ragIndexRouter.get('/files/:fileId', async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex
  const fileId = RagFileIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId, ragIndexId: ragIndex.id },
    include: { model: RagIndex, as: 'ragIndex' },
  })

  if (!ragFile) {
    throw ApplicationError.NotFound('File not found')
  }

  let fileContent: string

  if (shouldRenderAsText(ragFile.fileType) || ragFile.fileType === 'application/pdf') {
    const fileContentText = await FileStore.readRagFileTextContent(ragFile)
    if (fileContentText === null) {
      fileContent = 'File content is not available'
    } else {
      fileContent = fileContentText
    }
  } else {
    fileContent = 'this file cannot be displayed as readable text'
  }

  ragFile.ragIndex = ragIndex

  res.json({
    ...ragFile.toJSON(),
    fileContent,
  })
})

ragIndexRouter.delete('/files/:fileId', async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex
  const fileId = RagFileIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId, ragIndexId: ragIndex.id },
  })

  if (!ragFile) {
    throw ApplicationError.NotFound('File not found')
  }

  // Delete file from disk
  await FileStore.deleteRagFileDocument(ragFile)

  // Delete from vector store
  /* @todo langchain impl
  const client = getAzureOpenAIClient()
  try {
    if (ragFile.metadata?.vectorStoreFileId) {
      await client.vectorStores.files.del(ragIndex.metadata.azureVectorStoreId, ragFile.metadata?.vectorStoreFileId)
    }
  } catch (error) {
    console.error(`Failed to delete file from Azure vector store:`, error)
    throw ApplicationError.InternalServerError('Failed to delete file from vector store')
  }
  */

  // Delete RagFile record
  await ragFile.destroy()
  res.json({ message: 'File deleted successfully' })
})

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    acl: 'private',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname })
    },
    key: (req, file, cb) => {
      const { ragIndex } = req as RagIndexRequest
      const uniqueFilename = file.originalname
      const s3key = `uploads/rag/${ragIndex.id}/${uniqueFilename}`
      cb(null, s3key)
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
})
const uploadMiddleware = upload.array('files')

const indexUploadDirMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const { ragIndex } = req as RagIndexRequest
  await FileStore.createRagIndexDir(ragIndex)
  next()
}

ragIndexRouter.post('/upload', [indexUploadDirMiddleware, uploadMiddleware], async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const { ragIndex, user } = ragIndexRequest

  await Promise.all(
    req.files.map((file: Express.Multer.File) =>
      RagFile.create({
        userId: user.id,
        ragIndexId: ragIndex.id,
        pipelineStage: 'uploading',
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        metadata: {},
      }),
    ),
  )

  ingestRagFiles(ragIndex).catch((error) => {
    console.error('Error ingesting RAG files:', error)
  })

  res.json({ message: 'Files uploaded successfully' })
})

ragIndexRouter.post('/search', async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const { ragIndex } = ragIndexRequest
  const searchParams = SearchSchema.parse(req.body)

  const { results, timings } = await search(ragIndex, searchParams)

  res.json({ results, timings })
})

export default ragIndexRouter
