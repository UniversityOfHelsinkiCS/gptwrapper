import { type Job, Queue, QueueEvents } from 'bullmq'
import crypto from 'crypto'
import IORedis from 'ioredis'
import { getDocument, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ApplicationError } from 'src/server/util/ApplicationError'
import logger from 'src/server/util/logger'
import type { RagFile } from '../../db/models'
import { BMQ_REDIS_CA, BMQ_REDIS_CERT, BMQ_REDIS_HOST, BMQ_REDIS_KEY, BMQ_REDIS_PORT, S3_BUCKET } from '../../util/config'
import { FileStore } from '../rag/fileStore'

const sequenceReplacements = {
  ä: /¨ a/g,
  ö: /¨ o/g,
}

const fixAakkoset = (text: string) => {
  for (const [replacement, regex] of Object.entries(sequenceReplacements)) {
    text = text.replace(regex, replacement)
  }

  return text
}

export const extractPageText = async (page: PDFPageProxy): Promise<string> => {
  const textContent = await page.getTextContent()
  const parts: string[] = []
  for (const item of textContent.items as any[]) {
    if (typeof item.str === 'string' && item.str.length > 0) {
      parts.push(item.str)
    }
  }
  const text = parts.join(' ')
  return fixAakkoset(text.trim())
}

type PageInfo = {
  text: string
  png: Uint8Array
  job?: Job
}

const analyzeAndPreparePDFPages = async (pdfBytes: Uint8Array, scale = 2.0) => {
  //scale at 2.0 to keep closer to 200dpi which is ideal for vlms
  const loadingTask = getDocument({ data: pdfBytes })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  const pageInfo: PageInfo[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)

    const viewport = page.getViewport({ scale })
    const canvasFactory = pdf.canvasFactory
    //@ts-expect-error
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
    } as any).promise
    const pngBuffer = canvasAndContext.canvas.toBuffer('image/png')

    const text = await extractPageText(page)
    pageInfo.push({
      text,
      png: new Uint8Array(pngBuffer),
    })
  }

  return pageInfo
}

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

export const queue = new Queue('vlm-queue', {
  connection,
})

export const getPdfParsingJobId = (ragFile: RagFile) => {
  const s3Key = FileStore.getRagFileKey(ragFile)
  return `scan:${S3_BUCKET}/${s3Key}`
}

export const pdfQueueEvents = new QueueEvents('vlm-queue', { connection })

type VLMJobData = {
  type: 'vlm-job'
  ragFileId: number
  pageNumber: number
  bytes: string
  text: string
}

const isImage = (ragFile: RagFile) => ragFile.fileType === 'image/png'

/**
 * Adds an advanced pdf parsing job to the queue. The file must be uploaded to S3 beforehand. The jobId is based on the ragFile - resubmitting with the same jobId while the previous job is running has no effect.
 * @param ragFile
 * @returns the pages which is array of PageInfo objects
 */
export const submitAdvancedParsingJobs = async (ragFile: RagFile) => {
  const fileBytes = await FileStore.readRagFileContextToBytes(ragFile)

  if (!fileBytes) {
    console.error(`Failed to read file ${ragFile.filename} in S3`)
    throw ApplicationError.InternalServerError('Failed to read file')
  }

  const pages = isImage(ragFile)
    ? [{ text: '', png: fileBytes } as PageInfo]
    : await analyzeAndPreparePDFPages(fileBytes)

  const baseJobId = crypto.randomBytes(20).toString('hex')

  for (let i = 0; i < pages.length; i++) {
    const pageNumber = i + 1
    const info = pages[i]
    const jobId = `${baseJobId}:page:${pageNumber}`

    const jobData: VLMJobData = {
      type: 'vlm-job',
      ragFileId: ragFile.id,
      pageNumber,
      bytes: Buffer.from(info.png).toString('base64'),
      text: info.text,
    }

    logger.info(`Submitting PDF parsing job ${jobId}`)

    info.job = await queue.add(jobId, jobData, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    })
  }

  return pages
}

export const simplyParsePdf = async (ragFile: RagFile) => {
  const pdfBytes = await FileStore.readRagFileContextToBytes(ragFile)

  if (!pdfBytes) {
    console.error(`Failed to read PDF text file ${ragFile.filename} in S3`)
    throw ApplicationError.InternalServerError('Failed to read PDF text file')
  }
  const pages = await analyzeAndPreparePDFPages(pdfBytes)

  return pages
}
