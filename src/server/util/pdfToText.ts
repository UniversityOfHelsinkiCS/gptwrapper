import pdf from 'pdf-parse-fork'
import IORedis from 'ioredis'
import { BMQ_REDIS_CA, BMQ_REDIS_CERT, BMQ_REDIS_HOST, BMQ_REDIS_KEY, BMQ_REDIS_PORT, S3_BUCKET } from './config'
import { Queue, QueueEvents } from 'bullmq'

export const pdfToText = async (fileBuffer: Buffer) => {
  try {
    const data = await pdf(fileBuffer)

    return data.text as string
  } catch (error) {
    console.log(error)
    throw new Error('Error parsing PDF')
  }
}

const connection = new IORedis({
  host: 'redis',
  port: 6379,
  // tls: {
  //   ca: BMQ_REDIS_CA,
  //   cert: BMQ_REDIS_CERT,
  //   key: BMQ_REDIS_KEY,
  //   servername: BMQ_REDIS_HOST,
  // }
})

const queue = new Queue('llama-scan-queue', {
  connection
})

export const pdfToTextWithVLM = async (filename: string, prefix: string) => {
  const jobId = `scan:${S3_BUCKET}/${filename}/${prefix}`

  const job = await queue.add(
    'llama-scan-queue',
    {
      s3Bucket: S3_BUCKET,
      s3Key: filename,
      outputBucket: S3_BUCKET,
      outputPrefix: prefix,
    },
    { jobId }
  )

  return job
}
