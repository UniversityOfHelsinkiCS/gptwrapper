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

let creds: Record<string, any> = {
  host: BMQ_REDIS_HOST,
  port: BMQ_REDIS_PORT,
}


if (BMQ_REDIS_CA !== 'none') {
  creds = {
    ...creds,
    tls: {
      ca: BMQ_REDIS_CA,
      cert: BMQ_REDIS_CERT,
      key: BMQ_REDIS_KEY,
      servername: BMQ_REDIS_HOST,
    }
  }
}

const connection = new IORedis(creds)


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
