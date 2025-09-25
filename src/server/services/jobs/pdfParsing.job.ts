import IORedis from 'ioredis'
import { BMQ_REDIS_CA, BMQ_REDIS_CERT, BMQ_REDIS_HOST, BMQ_REDIS_KEY, BMQ_REDIS_PORT, S3_BUCKET } from '../../util/config'
import { Job, Queue, QueueEvents } from 'bullmq'
import { FileStore } from '../rag/fileStore'
import { RagFile } from '../../db/models'

let creds: Record<string, any> = {
  host: BMQ_REDIS_HOST,
  port: BMQ_REDIS_PORT,
}

if (BMQ_REDIS_CA !== 'none') {
  creds = {
    ...creds,
    maxRetriesPerRequest: null,
    tls: {
      ca: BMQ_REDIS_CA,
      cert: BMQ_REDIS_CERT,
      key: BMQ_REDIS_KEY,
      servername: BMQ_REDIS_HOST,
    },
  }
}

const connection = new IORedis(creds)

export const queue = new Queue('llama-scan-queue', {
  connection,
})

export const getPdfParsingJobId = (ragFile: RagFile) => {
  const s3Key = FileStore.getRagFileKey(ragFile)
  return `scan:${S3_BUCKET}/${s3Key}`
}

export const pdfQueueEvents = new QueueEvents('llama-scan-queue', { connection })

pdfQueueEvents.on('progress', async (progressEvent) => {
  const data = progressEvent.data as { ragFileId: number; progress: number }
  await RagFile.update({ progress: data.progress }, { where: { id: data.ragFileId } })
})

type PDFJobData = {
  s3Bucket: string
  s3Key: string
  outputBucket: string
  ragFileId: number
}

/**
 * Adds a pdf parsing job to the queue. The file must be uploaded to S3 beforehand. The jobId is based on the ragFile - resubmitting with the same jobId while the previous job is running has no effect.
 * @param ragFile
 * @returns the job
 */
export const submitPdfParsingJob = async (ragFile: RagFile) => {
  const s3Key = FileStore.getRagFileKey(ragFile)
  const jobId = getPdfParsingJobId(ragFile)
  console.log(`Submitting PDF parsing job ${jobId}`)
  const jobData: PDFJobData = {
    s3Bucket: S3_BUCKET,
    s3Key,
    outputBucket: S3_BUCKET,
    ragFileId: ragFile.id,
  }
  const job = await queue.add(jobId, jobData, { jobId, removeOnComplete: true, removeOnFail: true })

  return job
}
