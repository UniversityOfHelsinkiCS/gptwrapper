import pdf from 'pdf-parse-fork'
import { REDIS_HOST, REDIS_PORT } from './config'
import { Queue, QueueEvents, Worker, Job } from 'bullmq'

export const pdfToText = async (fileBuffer: Buffer) => {
  try {
    const data = await pdf(fileBuffer)

    return data.text as string
  } catch (error) {
    console.log(error)
    throw new Error('Error parsing PDF')
  }
}

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
}

const vlmQueue = new Queue('vlm-pdf-processing', { connection })
const vlmQueueEvents = new QueueEvents('vlm-pdf-processing', { connection })

const vlmWorker = new Worker('vlm-pdf-processing', async (job: Job) => {
  const { pdfBuffer } = job.data
  const result = await pdfToText(pdfBuffer)

  return result

}, { connection, autorun: false })

export const pdfToTextWithVLM = async (
  fileBuffer: Buffer
) => {
  const job = await vlmQueue.add('vlm-pdf-processing', {
    pdfBuffer: fileBuffer
  })

  const result = await job.waitUntilFinished(vlmQueueEvents)
  return result
}

vlmWorker.run()


