import { type NextFunction, type Request, type Response, Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
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
import { IngestionJobStatus } from '@shared/ingestion'

const ragIndexRouter = Router()

interface RagIndexRequest extends RequestWithUser {
  ragIndex: RagIndex
  uploadedS3Keys?: string[]
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
  const [responsibilities, ragIndex] = await Promise.all([
    Responsibility.findAll({
      where: { userId: user.id },
    }),
    RagIndex.findByPk(ragIndexId, {
      include: { model: ChatInstance, as: 'chatInstances' },
    }),
  ])

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

  res.json({
    ...ragIndex.toJSON(),
    ragFiles: ragFiles.map((file) => file.toJSON()),
  })
})

ragIndexRouter.get('/jobs', async (req, res) => {
  const ragIndexRequest = req as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex

  const ragFiles = await RagFile.findAll({
    where: { ragIndexId: ragIndex.id },
  })

  const ragFileStatuses: IngestionJobStatus[] = await Promise.all(
    ragFiles.map(async (rf) => {
      const meta = rf.metadata

      const status: IngestionJobStatus = {
        ragFileId: rf.id,
        message: meta?.message,
        progress: rf.progress,
        eta: meta?.eta,
        pipelineStage: rf.pipelineStage,
        error: rf.error ?? undefined,
      }

      return status
    }),
  )

  res.json(ragFileStatuses)
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

  // Delete file from s3
  await FileStore.deleteRagFileDocument(ragFile)

  // Delete RagFile record
  await ragFile.destroy()

  // Now we need to re-ingest
  ingestRagFiles(ragIndex).catch((error) => {
    console.error('Error ingesting RAG files:', error)
  })

  res.json({ message: 'File deleted successfully, re-ingesting' })
})

ragIndexRouter.delete('/files/:fileId/text', async (req, res) => {
  const ragIndexRequest = req as unknown as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex
  const fileId = RagFileIdSchema.parse(req.params.fileId)

  const ragFile = await RagFile.findOne({
    where: { id: fileId, ragIndexId: ragIndex.id },
  })

  if (!ragFile) {
    throw ApplicationError.NotFound('File not found')
  }

  // Delete the text version file from s3 if it exists
  await FileStore.deleteRagFileText(ragFile)

  // Now we need to re-ingest
  ingestRagFiles(ragIndex).catch((error) => {
    console.error('Error ingesting RAG files:', error)
  })

  res.json({ message: 'File text version deleted successfully, re-ingesting' })
})

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    acl: 'private',
    metadata: (_req, file, cb) => {
      cb(null, { fieldName: file.fieldname })
    },
    key: (req, _file, cb) => {
      const r = req as RagIndexRequest
      const s3key = crypto.randomBytes(20).toString('hex')
      r.uploadedS3Keys = r.uploadedS3Keys || []
      r.uploadedS3Keys.push(s3key)
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
  const { ragIndex, user, uploadedS3Keys = [] } = ragIndexRequest

  const ragFiles = await Promise.all(
    req.files.map((file: Express.Multer.File, idx) =>
      RagFile.create({
        userId: user.id,
        ragIndexId: ragIndex.id,
        pipelineStage: 'ingesting',
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        s3Key: uploadedS3Keys[idx],
        metadata: {},
      }),
    ),
  )

  ingestRagFiles(ragIndex, ragFiles).catch((error) => {
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
