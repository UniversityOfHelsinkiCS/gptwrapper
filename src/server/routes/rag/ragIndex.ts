import fs from 'node:fs'
import { type NextFunction, type Request, type Response, Router } from 'express'
import { ChatInstance, RagFile, RagIndex, Responsibility } from '../../db/models'
import type { RequestWithUser } from '../../types'
import z from 'zod/v4'
import multer from 'multer'
import { mkdir, rm, stat } from 'node:fs/promises'
import { getAzureOpenAIClient } from '../../util/azure/client'
import { shouldRenderAsText } from '../../../shared/utils'
import { ApplicationError } from '../../util/ApplicationError'

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

const UPLOAD_DIR = 'uploads/rag'

ragIndexRouter.delete('/', async (req, res) => {
  const ragIndexRequest = req as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex

  const uploadPath = `${UPLOAD_DIR}/${ragIndex.id}`
  try {
    await rm(uploadPath, { recursive: true, force: true })
    console.log(`Upload directory ${uploadPath} deleted`)
  } catch (error) {
    console.warn(`Upload directory ${uploadPath} not found, nothing to delete --- `, error)
  }

  await ragIndex.destroy() // Cascade deletes RagFiles

  res.json({ message: 'Index deleted' })
})

ragIndexRouter.get('/', async (req, res) => {
  const ragIndexRequest = req as RagIndexRequest
  const ragIndex = ragIndexRequest.ragIndex

  const ragFiles = await RagFile.findAll({
    where: { ragIndexId: ragIndex.id },
  })

  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.retrieve(ragIndex.metadata.azureVectorStoreId)

  res.json({
    ...ragIndex.toJSON(),
    ragFiles: ragFiles.map((file) => file.toJSON()),
    vectorStore,
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

  if (shouldRenderAsText(ragFile.fileType)) {
    // Read file content
    const filePath = `${UPLOAD_DIR}/${ragIndex.id}/${ragFile.filename}`
    try {
      fileContent = await fs.promises.readFile(filePath, 'utf-8')
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error)
      throw ApplicationError.InternalServerError('Failed to read file content')
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

  await RagFile.update(
    { pipelineStage: 'deleting' },
    {
      where: { id: ragFile.id },
    },
  )

  // Delete file from disk
  const filePath = `${UPLOAD_DIR}/${ragIndex.id}/${ragFile.filename}`
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error)
    throw ApplicationError.InternalServerError('Failed to delete file')
  }

  // Delete from vector store
  const client = getAzureOpenAIClient()
  try {
    if (ragFile.metadata?.vectorStoreFileId) {
      await client.vectorStores.files.del(ragIndex.metadata.azureVectorStoreId, ragFile.metadata?.vectorStoreFileId)
    }
  } catch (error) {
    console.error(`Failed to delete file from Azure vector store:`, error)
    throw ApplicationError.InternalServerError('Failed to delete file from vector store')
  }

  // Delete RagFile record
  await ragFile.destroy()
  res.json({ message: 'File deleted successfully' })
})

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const { ragIndex } = req as RagIndexRequest
      const uploadPath = `${UPLOAD_DIR}/${ragIndex.id}`
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
  const uploadPath = `${UPLOAD_DIR}/${ragIndex.id}`
  try {
    await stat(uploadPath)
    console.log(`RAG upload dir exists: ${uploadPath}`)
  } catch (error) {
    console.warn(`RAG upload dir not found, creating ${uploadPath}`)
    await mkdir(uploadPath, { recursive: true })
  }
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

  const client = getAzureOpenAIClient()

  const uploadDirPath = `${UPLOAD_DIR}/${ragIndex.id}`

  await Promise.all(
    ragFiles.map(async (ragFile) => {
      const filePath = `${uploadDirPath}/${ragFile.filename}`
      const stream = fs.createReadStream(filePath)

      const uploadedFile = await client.files.create({
        file: stream,
        purpose: 'user_data',
      })
      const vectorStoreFile = await client.vectorStores.files.create(ragIndex.metadata.azureVectorStoreId, {
        file_id: uploadedFile.id,
        attributes: {
          ragIndexId: ragIndex.id,
        },
      })

      console.log(`File ${filePath} uploaded to vector store`)
      await RagFile.update(
        {
          pipelineStage: 'completed',
          metadata: {
            chunkingStrategy: vectorStoreFile.chunking_strategy?.type,
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

export default ragIndexRouter
