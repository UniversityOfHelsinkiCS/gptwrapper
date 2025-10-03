import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
  NoSuchKey,
} from '@aws-sdk/client-s3'
import type { RagFile, RagIndex } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import { S3_BUCKET } from '../../util/config'
import { s3Client } from '../../util/s3client'

const isPdf = (filePath: string) => filePath.endsWith('.pdf')
const getPdfTextKey = (s3Key: string) => `${s3Key}.md`

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
      let continuationToken: string | undefined = undefined
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: S3_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        const listResponse = (await s3Client.send(listCommand)) as ListObjectsV2CommandOutput
        const keys = (listResponse.Contents || []).map((obj) => ({ Key: obj.Key! }))

        if (keys.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: S3_BUCKET,
            Delete: { Objects: keys },
          })
          const deleteResponse = await s3Client.send(deleteCommand)
          console.log('Deleted:', deleteResponse.Deleted?.length, 'objects.')
        }

        continuationToken = listResponse.NextContinuationToken
      } while (continuationToken)
    } catch (error) {
      console.warn(`Failed to delete S3 objects with prefix ${prefix}:`, error)
    }
  },

  async deleteRagFileText(ragFile: RagFile) {
    const s3Key = FileStore.getRagFileKey(ragFile)

    try {
      if (isPdf(s3Key)) {
        const pdfTextKey = getPdfTextKey(s3Key)
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: pdfTextKey }))
        return true
      }
    } catch (error) {
      console.error(`Failed to delete file ${getPdfTextKey(s3Key)} from S3:`, error)
    }

    return false
  },

  async deleteRagFileDocument(ragFile: RagFile) {
    await FileStore.deleteRagFileText(ragFile)

    const s3Key = FileStore.getRagFileKey(ragFile)

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
      } catch (error) {
        // Check if key does not exist
        if (error instanceof NoSuchKey) {
          return null
        }

        console.error(`Failed to read PDF text file ${pdfTextKey} in S3:`, error)
        throw ApplicationError.InternalServerError('Failed to read PDF text file')
      }
    }

    try {
      const fileObj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
      const text = await streamToString(fileObj.Body)
      return text
    } catch (error) {
      // Check if key does not exist
      if (error instanceof NoSuchKey) {
        return null
      }

      console.error(`Failed to read file ${s3Key} from S3:`, error)
      throw ApplicationError.InternalServerError('Failed to read file content')
    }
  },

  // S3 does not require creating directories
  async createRagIndexDir(_ragIndex: RagIndex) {
    // No-op for S3
    return
  },

  async readRagFileContextToBytes(ragFile: RagFile) {
    const s3Key = FileStore.getRagFileKey(ragFile)
    try {
      const obj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
      const buffer = await streamToBuffer(obj.Body as NodeJS.ReadableStream)
      return new Uint8Array(buffer)
    } catch (error) {
      // Check if key does not exist
      if (error instanceof NoSuchKey) {
        return null
      }
    }
  },

  async writeRagFileTextContent(ragFile: RagFile, textContent: string) {
    const s3Key = FileStore.getRagFileKey(ragFile)
    const pdfTextKey = getPdfTextKey(s3Key)
    try {
      await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: pdfTextKey, Body: textContent, ContentType: 'text/markdown charset=utf-8' }))
    } catch (error) {
      console.error(`Error while uploading file to s3: ${error}`)
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


const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
