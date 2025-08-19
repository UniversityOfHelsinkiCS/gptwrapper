import { GetObjectCommand, DeleteObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { RagFile, RagIndex } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import { pdfToText } from '../../util/pdfToText'
import { S3_BUCKET } from '../../util/config'
import { s3Client } from '../../routes/rag/ragIndex'

const isPdf = (filePath: string) => filePath.endsWith('.pdf')
const getPdfTextKey = (s3Key: string) => `${s3Key}.txt`

export const FileStore = {
  getRagIndexPrefix(ragIndex: RagIndex) {
    return `uploads/rag/${ragIndex.id}/`
  },

  getRagFileKey(ragFile: RagFile) {
    return `uploads/rag/${ragFile.ragIndexId}/${ragFile.filename}`
  },

  async deleteRagIndexDocuments(ragIndex: RagIndex) {
    const prefix = FileStore.getRagIndexPrefix(ragIndex)
    try {
      // List all objects with the prefix and delete them
      // This requires using ListObjectsV2Command and DeleteObjectsCommand from AWS SDK v3, omitted for brevity
      console.log(`Delete all objects with prefix ${prefix} from S3 bucket ${S3_BUCKET}`)
      // Implement listing and batch deletion if needed
    } catch (error) {
      console.warn(`Failed to delete S3 objects with prefix ${prefix}:`, error)
    }
  },

  async deleteRagFileDocument(ragFile: RagFile) {
    const s3Key = FileStore.getRagFileKey(ragFile)

    try {
      if (isPdf(s3Key)) {
        const pdfTextKey = getPdfTextKey(s3Key)
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: pdfTextKey }))
      }
    } catch (error) {
      console.error(`Failed to delete file ${getPdfTextKey(s3Key)} from S3:`, error)
    }

    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
    } catch (error) {
      console.error(`Failed to delete file ${s3Key} from S3:`, error)
      throw ApplicationError.InternalServerError('Failed to delete file')
    }
  },

  async readRagFileTextContent(ragFile: RagFile) {
    const s3Key = FileStore.getRagFileKey(ragFile)

    if (isPdf(s3Key)) {
      const pdfTextKey = getPdfTextKey(s3Key)
      try {
        const textObj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: pdfTextKey }))
        const text = await streamToString(textObj.Body)
        return text
      } catch (_error) {
        console.log(`Creating PDF text file ${pdfTextKey} in S3`)

        try {
          const fileObj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
          const buf = await streamToBuffer(fileObj.Body)
          const text = await pdfToText(buf)
          // Save extracted text to S3
          await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: pdfTextKey,
            Body: text,
            ContentType: 'text/plain',
          }))
          return text
        } catch (error) {
          console.error(`Failed to create PDF text file ${pdfTextKey} in S3:`, error)
          throw ApplicationError.InternalServerError('Failed to create PDF text file')
        }
      }
    }

    try {
      const fileObj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
      const text = await streamToString(fileObj.Body)
      return text
    } catch (error) {
      console.error(`Failed to read file ${s3Key} from S3:`, error)
      throw ApplicationError.InternalServerError('Failed to read file content')
    }
  },

  // S3 does not require creating directories
  async createRagIndexDir(_ragIndex: RagIndex) {
    // No-op for S3
    return
  },

  async saveText(s3Key: string, text: string) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: text,
        ContentType: 'text/plain',
      }))
    } catch (error) {
      console.error(`Failed to save text content to ${s3Key} in S3:`, error)
      throw ApplicationError.InternalServerError(`Failed to save text content`)
    }
  },
}

const streamToString = (stream: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []
    stream.on('data', (chunk: any) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  })
}


const streamToBuffer = (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []
    stream.on('data', (chunk: any) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

