import IORedis, { RedisOptions } from 'ioredis'
import { REDIS_HOST, REDIS_PORT, S3_BUCKET } from '../../util/config'
import { Job, Queue, QueueEvents, Worker } from 'bullmq'
import { FileStore } from '../rag/fileStore'
import { RagFile } from '../../db/models'
import { ingestRagFile } from '../rag/ingestion'

const creds: RedisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
}

const connection = new IORedis(creds)

export const queue = new Queue('ingestion-queue', {
  connection,
})

export const getIngestionJobId = (ragFile: RagFile) => {
  const s3Key = FileStore.getRagFileKey(ragFile)
  return `ingest:${S3_BUCKET}/${s3Key}`
}

export const ingestionQueueEvents = new QueueEvents('ingestion-queue', { connection })

type IngestionJobData = {
  type: 'ingestion'
  s3Bucket: string
  s3Key: string
  outputBucket: string
  ragFileId: number
}

/**
 * @param ragFile
 * @returns the job
 */
export const submitIngestionJob = async (ragFile: RagFile) => {
  const s3Key = FileStore.getRagFileKey(ragFile)
  const jobId = getIngestionJobId(ragFile)
  const jobData: IngestionJobData = {
    type: 'ingestion',
    s3Bucket: S3_BUCKET,
    s3Key,
    outputBucket: S3_BUCKET,
    ragFileId: ragFile.id,
  }
  const job = await queue.add(jobId, jobData, { jobId, removeOnComplete: true, removeOnFail: true })

  return job
}

new Worker<IngestionJobData>(
  'ingestion-queue',
  async (job: Job<IngestionJobData>) => {
    await job.updateProgress({ progress: 0, message: 'Starting', eta: 10_000 })

    const { ragFileId } = job.data

    console.log(`Processing ingestion job ${job.id}`)
    const ragFile = await RagFile.findByPk(ragFileId, { include: ['ragIndex'] })
    if (!ragFile) {
      throw new Error(`RagFile with id ${ragFileId} not found`)
    }

    await ingestRagFile(ragFile, ragFile.ragIndex!, job)
  },
  { connection },
)
