import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Worker } from 'bullmq'
import dotenv from 'dotenv'
import Redis, { type RedisOptions } from 'ioredis'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import pdfToText from 'pdf-parse-fork'
import { pdfToPng, type PngPageOutput } from 'pdf-to-png-converter'
import logger from './logger'

dotenv.config()

const pipelineAsync = promisify(pipeline)

async function downloadS3ToFile(s3: S3Client, bucket: string, key: string, destPath: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  await fs.mkdir(path.dirname(destPath), { recursive: true })
  if (!res.Body) {
    throw new Error('No Body in S3 GetObject response')
  }
  await pipelineAsync(res.Body, createWriteStream(destPath))
}

async function uploadFileToS3(s3: S3Client, bucket: string, key: string, filePath: string, contentType: string) {
  const Body = await fs.readFile(filePath)
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body, ContentType: contentType }))
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.txt') return 'text/plain charset=utf-8'
  if (ext === '.json') return 'application/json'
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.md') return 'text/markdown charset=utf-8'
  if (ext === '.csv') return 'text/csv charset=utf-8'
  return 'application/octet-stream'
}

// --- Config ---

const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PORT = process.env.REDIS_PORT
const CA = process.env.CA || undefined
const CERT = process.env.CERT
const KEY = process.env.KEY

let creds: RedisOptions = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
}

if (CA !== undefined) {
  creds = {
    ...creds,
    tls: {
      ca: CA,
      cert: CERT,
      key: KEY,
      servername: REDIS_HOST,
    },
  }
}

const RETRY_COUNT = 1

const connection = new Redis(creds)

const QUEUE_NAME = process.env.LLAMA_SCAN_QUEUE || 'llama-scan-queue'
const S3_HOST = process.env.S3_HOST || ''
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || ''
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ''
const OLLAMA_URL = process.env.LAAMA_API_URL ?? process.env.OLLAMA_URL
const LAAMA_API_TOKEN = process.env.LAAMA_API_TOKEN ?? ''

const s3 = new S3Client({
  region: 'eu-north-1',
  endpoint: S3_HOST,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
})

async function retryOllamaCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
    // Health check before each attempt
    try {
      return await fn()
    } catch (err) {
      lastError = err
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastError
}

// --- Worker ---

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { s3Bucket, s3Key, outputBucket } = job.data || {}

    /**
     *  Full progress from 0 to 100
     */
    let _progress = 0
    /**
     *
     * @param progress fraction (0-1) of progress of the current section
     * @param sectionSize the size of the section as a percentage of the whole job (0-100). All section sizes should add up to 100.
     */
    const incrementProgress = (progress: number, sectionSize: number) => {
      _progress += progress * sectionSize
      job
        .updateProgress({
          ragFileId: job.data.ragFileId,
          progress: _progress,
        })
        .catch(() => { })
    }

    logger.info(`Processing job ${job.id}`)

    if (!s3Bucket || !s3Key) {
      throw new Error('s3Bucket and s3Key are required in job data')
    }
    if (!outputBucket) {
      throw new Error('outputBucket is required in job data')
    }

    const jobId = job.id
    if (!jobId) {
      throw new Error('Job ID is missing')
    }
    const jobIdPath = jobId.replaceAll('\/', '_')

    const uploadsDir = './uploads'
    const jobRootDir = path.join(uploadsDir, jobIdPath)
    const inputFileName = path.basename(s3Key) || 'input.bin'
    const inputLocalPath = path.join(jobRootDir, inputFileName)
    const outputBaseDir = path.join(jobRootDir, 'output')
    const outputTextDir = path.join(outputBaseDir, 'text')
    const outputImagesDir = path.join(outputBaseDir, 'images')

    try {
      await fs.mkdir(path.dirname(inputLocalPath), { recursive: true })
      await fs.mkdir(outputBaseDir, { recursive: true })
      await fs.mkdir(outputTextDir, { recursive: true })
      await fs.mkdir(outputImagesDir, { recursive: true })

      incrementProgress(1, 1) // 1% - Setup directories

      /**
       * Download the pdf
       */
      try {
        await downloadS3ToFile(s3, s3Bucket, s3Key, inputLocalPath)
      } catch (err) {
        throw new Error(`Failed to download s3://${s3Bucket}/${s3Key}: ${err.message || err}`)
      }

      incrementProgress(1, 1) // 1% - Download PDF

      /**
       * Convert PDF pages to text
       */
      function pagerender(pageData) {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        }
        return pageData.getTextContent(render_options).then((textContent) => {
          let lastY: number | null = null,
            text = ''
          for (let item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str
            } else {
              text += '\n' + item.str
            }
            lastY = item.transform[5]
          }
          return `${JSON.stringify({ text, pageNumber: pageData.pageNumber })}\n`
        })
      }

      const pages = {}

      try {
        const dataBuffer = await fs.readFile(inputLocalPath)
        const data = await pdfToText(dataBuffer, { pagerender })
        const jsonObjStrs = data.text.split('\n').filter((line) => line.trim().startsWith('{') && line.trim().endsWith('}'))
        jsonObjStrs
          .map((line) => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter((page) => page !== null && typeof page.pageNumber === 'number' && typeof page.text === 'string')
          .forEach((page) => {
            pages[page.pageNumber] = page.text
          })
        logger.info(`Job ${job.id}: PDF to text conversion complete`)
      } catch (error) {
        logger.error(`Job ${job.id} failed: PDF to text conversion failed`, error)
        throw new Error('PDF to text conversion failed')
      }

      incrementProgress(1, 2) // 2% - PDF to text

      /**
       * Convert PDF pages to PNG images
       */
      let pngPages: PngPageOutput[] = []
      try {
        pngPages = await pdfToPng(inputLocalPath, {
          outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
          outputFolder: outputImagesDir,
        })
      } catch (error) {
        logger.error(`Job ${job.id} failed: PDF to PNG conversion failed`, error)
        throw new Error('PDF to PNG conversion failed')
      }

      incrementProgress(1, 6) // 6% - PDF to PNGs. Total so far: 10%

      /**
       * Transcription & Markdown Generation (with Ollama health/retry, fallback to PDF text)
       */
      let resultingMarkdown = ''
      for (const pngPage of pngPages) {
        let finalText = ''
        const existingMdPath = path.join(outputTextDir, `${inputFileName}_page_${pngPage.pageNumber}.md`)
        if (await pathExists(existingMdPath)) {
          const existingMd = await fs.readFile(existingMdPath, 'utf-8')
          logger.info(`Job ${job.id}: using existing markdown for page ${pngPage.pageNumber}/${pngPages.length}`)
          resultingMarkdown += `\n\n${existingMd}`
          continue
        }

        logger.info(`Job ${job.id}: processing page ${pngPage.pageNumber}/${pngPages.length} (${pngPage.path})`)
        const pdfText = pages[pngPage.pageNumber] || ''
        let transcription = ''
        const existingTxtPath = path.join(outputTextDir, `${inputFileName}_page_${pngPage.pageNumber}.transcription.txt`)
        // ========== VLM section (with health/retry/fallback) ==========
        try {
          transcription = await retryOllamaCall(async () => {
            if (await pathExists(existingTxtPath)) {
              const txt = await fs.readFile(existingTxtPath, 'utf-8')
              logger.info(`Job ${job.id}: using existing transcription for page ${pngPage.pageNumber}/${pngPages.length}`)
              return txt
            }
            const image = await fs.readFile(pngPage.path)
            const response = await fetch(`${OLLAMA_URL}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'qwen2.5vl:7b',
                system: `Your task is to transcribe the content of a PDF page given to you as an image.
                  If the given PDF page contains an image, or a diagram, describe it in detail.
                  Enclose the description in an **image** tag. For example: **image** This is an image of a cat. **image**.
                  You are also given the text extracted from the PDF using a PDF parser.
                  Your task is to combine these two sources of information to produce the most accurate transcription possible.
                  When there are discrepancies between the image transcription and the PDF text, prioritize the parsed PDF text.
                  But you are always obligated to keep the **image** tags intact.`,
                prompt: `Parsed PDF text:\n${pdfText}\n\nImage transcription:`,
                stream: false,
                images: [image.toString('base64')],
              }),
            })
            if (!response.ok) {
              const errorBody = await response.text()
              throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`)
            }
            const data = await response.json()
            const txt = data?.response || ''
            await fs.writeFile(existingTxtPath, txt, 'utf-8')
            logger.info(`Job ${job.id}: transcription complete for page ${pngPage.pageNumber}/${pngPages.length}`)

            const pageProgress = 0.5 / pngPages.length // Halfway through the page processing
            incrementProgress(pageProgress, 87) // 87% - VLM & Markdown

            return txt
          }, RETRY_COUNT)
          finalText = await retryOllamaCall(async () => {
            const response2 = await fetch(`${OLLAMA_URL}/api/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                token: LAAMA_API_TOKEN,
              },
              body: JSON.stringify({
                model: 'qwen2.5vl:7b',
                system: `Your task is to accurately extract and combine text from image transcription and PDF sources into Markdown.
                  You are given text containing both the transcription text and PDF text.
                  When there are discrepancies between the transcription text and the PDF text, prioritize the PDF text!
                  Transcription can contain errors, PDF is the source of truth! If the texts are similar, merge them to create a comprehensive version.
                  Ensure the final output is well-structured Markdown and free of errors. Do not output anything else than Markdown.
                  Do not surround the output with a Markdown code block! Use headings, lists, bold, italics, tables etc. where appropriate.
                  Remeber you are always obligated to keep the **image** tags and tags insides intact.`,
                prompt: `Transcription:\n${transcription}\n\nPDF:\n${pdfText}\n\nCombined Markdown:`,
                stream: false,
              }),
            })
            if (!response2.ok) {
              const errorBody = await response2.text()
              throw new Error(`Ollama Markdown API request failed with status ${response2.status}: ${errorBody}`)
            }
            const data2 = await response2.json()
            let text = data2?.response || ''
            if (text.trim().startsWith('```markdown')) {
              text = text
                .replace(/^```markdown/, '')
                .replace(/```$/, '')
                .trim()
            }
            // Add page number to the end of the first line if it's a heading
            function appendToFirstLine(content, suffix) {
              return content.replace(/^[^\r\n]*/, (match) => match + suffix)
            }
            if (text.trim().startsWith('#')) {
              text = appendToFirstLine(text, ` (Page ${pngPage.pageNumber})`)
            }
            await fs.writeFile(existingMdPath, text, 'utf-8')
            logger.info(`Job ${job.id}: markdown generation complete for page ${pngPage.pageNumber}/${pngPages.length}`)

            return text
          }, RETRY_COUNT)
        } catch (error) {
          logger.warn(`Job ${job.id} VLM/Markdown failed ${RETRY_COUNT} times, falling back to PDF text for page ${pngPage.pageNumber}`, error)
          // Fallback to PDF text as Markdown
          finalText = pdfText ? `# Page ${pngPage.pageNumber}\n\n${pdfText}` : `# Page ${pngPage.pageNumber}\n\n**Page could not be processed.**`
          await fs.writeFile(existingMdPath, finalText, 'utf-8')
        }

        const pageProgress = 0.5 / pngPages.length // Second half of the page processing done
        incrementProgress(pageProgress, 87) // 87% - VLM & Markdown. Total so far: 97%

        resultingMarkdown += `\n\n${finalText}`
      }

      const resultFileName = `${inputFileName}.md`
      const resultFilePath = path.join(outputTextDir, `${inputFileName}.md`)
      await fs.writeFile(resultFilePath, resultingMarkdown, 'utf-8')

      try {
        const resultS3Key = s3Key + '.md'
        await uploadFileToS3(s3, outputBucket, resultS3Key, resultFilePath, guessContentType(resultFilePath))
        logger.info(`Job ${job.id}: uploaded results to s3://${outputBucket}/${resultFileName}`)
      } catch (err) {
        logger.error('Failed uploading outputs to S3:', err)
        throw new Error(`Failed uploading outputs to s3://${outputBucket}: ${err.message || err}`)
      }

      incrementProgress(1, 3) // 97 + 3 = 100% - Upload results

      return {
        input: { bucket: s3Bucket, key: s3Key },
        output: { bucket: outputBucket },
      }
    } finally {
      try {
        await fs.rm(jobRootDir, { recursive: true, force: true })
      } catch { }
    }
  },
  {
    connection,
  },
)

logger.info(`Worker started. Listening to queue "${QUEUE_NAME}"...`)

worker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed.`)
})

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err)
})

async function shutdown() {
  logger.info('Shutting down worker...')
  try {
    await worker.close()
  } catch { }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
