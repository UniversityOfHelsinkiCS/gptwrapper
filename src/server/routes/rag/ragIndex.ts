import { type NextFunction, type Request, type Response, Router } from 'express'
import multer from 'multer'
import z from 'zod/v4'
import { shouldRenderAsText } from '../../../shared/utils'
import { ChatInstance, RagFile, RagIndex, Responsibility } from '../../db/models'
import { FileStore } from '../../services/rag/fileStore'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import { ingestRagFile } from '../../services/rag/ingestion'
import { search } from '../../services/rag/search'
import { getRedisVectorStore } from '../../services/rag/vectorStore'

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
    fileContent = await FileStore.readRagFileTextContent(ragFile)
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

  await RagFile.update(
    { pipelineStage: 'deleting' },
    {
      where: { id: ragFile.id },
    },
  )

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
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const { ragIndex } = req as RagIndexRequest
      const uploadPath = FileStore.getRagIndexPath(ragIndex)
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
  const { ragIndex } = req as RagIndexRequest
  await FileStore.createRagIndexDir(ragIndex)
  next()
}

ragIndexRouter.post('/upload', [indexUploadDirMiddleware, uploadMiddleware], async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const { ragIndex, user } = ragIndexRequest

  if (!req.files || req.files.length === 0) {
    throw ApplicationError.BadRequest('No files uploaded')
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

  await Promise.all(
    ragFiles.map(async (rf) => {
      await ingestRagFile(rf)
      rf.pipelineStage = 'completed'
      await rf.save()
    }),
  )

  res.json({ message: 'Files uploaded successfully' })
})

const RagIndexSearchSchema = z.object({
  query: z.string().min(1).max(1000),
})

ragIndexRouter.post('/search', async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const { ragIndex } = ragIndexRequest
  const { query } = RagIndexSearchSchema.parse(req.body)

  const results = await search(query, ragIndex)

  res.json(results)
})

export default ragIndexRouter
