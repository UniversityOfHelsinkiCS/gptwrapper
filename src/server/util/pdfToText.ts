import pdf from 'pdf-parse-fork'
import axios from 'axios'
import { LAAMA_API_TOKEN, REDIS_HOST, REDIS_PORT } from './config'
import { Queue, QueueEvents, Worker, Job } from 'bullmq'

const dalaiClient = axios.create({
  baseURL: "https://api-gateway-toska.apps.ocp-bm-0.k8s.it.helsinki.fi/dalai",
  params: {
    token: LAAMA_API_TOKEN,
  },
})

export const pdfToText = async (fileBuffer: Buffer) => {
  try {
    const data = await pdf(fileBuffer)

    return data.text as string
  } catch (error) {
    console.log(error)
    throw new Error('Error parsing PDF')
  }
}

// const connection = {
//   host: REDIS_HOST,
//   port: REDIS_PORT,
// }

// const vlmQueue = new Queue('vlm-pdf-processing', { connection })
// const vlmQueueEvents = new QueueEvents('vlm-pdf-processing', { connection })

// const vlmWorker = new Worker(
//   'vlm-pdf-processing',
//   async (job: Job) => {
//     const { pdfBuffer } = job.data
//     const result = await dalaiClient.post(pdfBuffer)

//     return result
//   },
//   { connection, autorun: false },
// )

export const pdfToTextWithVLM = async (fileBuffer: Buffer) => {
  const form = new FormData()

  const pdfBlob = new Blob([fileBuffer], { type: "application/pdf" })
  form.append('file', pdfBlob, 'file.pdf')

  const response = await dalaiClient.post(
    '/scan',
    form,
    // @ts-ignore
    { headers: {} }
  )

  return response.data
}
