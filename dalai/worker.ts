import { Worker } from 'bullmq'
import path from 'node:path'
import fs from 'node:fs/promises'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { pipeline } from 'node:stream'
import { createWriteStream, createReadStream } from 'node:fs'
import Redis from 'ioredis'
import { pdfToPng } from 'pdf-to-png-converter'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'node:util'
import pdfToText from 'pdf-parse-fork'
import dotenv from 'dotenv'

dotenv.config()

const pipelineAsync = promisify(pipeline)

async function downloadS3ToFile(s3, bucket, key, destPath) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  await fs.mkdir(path.dirname(destPath), { recursive: true })
  await pipelineAsync(res.Body, createWriteStream(destPath))
}

async function uploadFileToS3(s3, bucket, key, filePath, contentType) {
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

function guessContentType(filePath) {
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

let creds = {
  host: REDIS_HOST,
  port: REDIS_PORT,
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
    }
  }
}

const RETRY_COUNT = 1

const connection = new Redis(creds)

const QUEUE_NAME = process.env.LLAMA_SCAN_QUEUE || 'llama-scan-queue'
const S3_HOST = process.env.S3_HOST || ''
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const OLLAMA_URL = process.env.LAAMA_API_URL ?? process.env.OLLAMA_URL
const LAAMA_API_TOKEN = process.LAAMA_API_TOKEN ?? ''

const s3 = new S3Client({
  region: 'eu-north-1',
  endpoint: S3_HOST,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
})

async function retryOllamaCall(fn, maxRetries = 3) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    // Health check before each attempt
    try {
      return await fn()
    } catch (err) {
      lastError = err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastError
}

// --- Worker ---

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const {
      s3Bucket,
      s3Key,
      outputBucket,
    } = job.data || {}

    console.log(`Processing job ${job.id}`)

    if (!s3Bucket || !s3Key) {
      throw new Error('s3Bucket and s3Key are required in job data')
    }
    if (!outputBucket) {
      throw new Error('outputBucket is required in job data')
    }

    const jobIdPath = job.id.replaceAll('\/', '_')

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

      /**
       * Download the pdf
       */
      try {
        await downloadS3ToFile(s3, s3Bucket, s3Key, inputLocalPath)
      } catch (err) {
        throw new Error(`Failed to download s3://${s3Bucket}/${s3Key}: ${err.message || err}`)
      }

      /**
      * Convert PDF pages to text
      */
      function pagerender(pageData) {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        }
        return pageData.getTextContent(render_options).then((textContent) => {
          let lastY, text = ''
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str
            } else {
              text += "\n" + item.str
            }
            lastY = item.transform[5]
          }
          return `${JSON.stringify({ text, pageNumber: pageData.pageNumber })}\n`;
        })
      }

      const pages = {}

      try {
        const dataBuffer = await fs.readFile(inputLocalPath)
        const data = await pdfToText(dataBuffer, { pagerender })
        const jsonObjStrs = data.text.split('\n').filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'))
        jsonObjStrs.map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        }).filter(page => page !== null && typeof page.pageNumber === 'number' && typeof page.text === 'string').forEach(page => {
          pages[page.pageNumber] = page.text
        })
        console.log(`Job ${job.id}: PDF to text conversion complete`)
      } catch (error) {
        console.error(`Job ${job.id} failed: PDF to text conversion failed`, error)
        throw new Error('PDF to text conversion failed')
      }

      /**
       * Convert PDF pages to PNG images
       */
      let pngPages
      try {
        pngPages = await pdfToPng(inputLocalPath, {
          outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
          outputFolder: outputImagesDir,
        });
      } catch (error) {
        console.error(`Job ${job.id} failed: PDF to PNG conversion failed`, error)
        throw new Error('PDF to PNG conversion failed')
      }

      /**
       * Transcription & Markdown Generation (with Ollama health/retry, fallback to PDF text)
       */
      let resultingMarkdown = ''
      for (const pngPage of pngPages) {
        let finalText = ''
        const existingMdPath = path.join(outputTextDir, `${inputFileName}_page_${pngPage.pageNumber}.md`)
        if (await pathExists(existingMdPath)) {
          const existingMd = await fs.readFile(existingMdPath, 'utf-8')
          console.log(`Job ${job.id}: using existing markdown for page ${pngPage.pageNumber}/${pngPages.length}`)
          resultingMarkdown += `\n\n${existingMd}`
          continue
        }

        console.log(`Job ${job.id}: processing page ${pngPage.pageNumber}/${pngPages.length} (${pngPage.path})`)
        const pdfText = pages[pngPage.pageNumber] || ''
        let transcription = ''
        const existingTxtPath = path.join(outputTextDir, `${inputFileName}_page_${pngPage.pageNumber}.transcription.txt`)
        // ========== VLM section (with health/retry/fallback) ==========
        try {
          transcription = await retryOllamaCall(async () => {
            if (await pathExists(existingTxtPath)) {
              const txt = await fs.readFile(existingTxtPath, 'utf-8')
              console.log(`Job ${job.id}: using existing transcription for page ${pngPage.pageNumber}/${pngPages.length}`)
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
                images: [image.toString('base64')]
              })
            })
            if (!response.ok) {
              const errorBody = await response.text()
              throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`)
            }
            const data = await response.json()
            const txt = data?.response || ''
            await fs.writeFile(existingTxtPath, txt, 'utf-8')
            console.log(`Job ${job.id}: transcription complete for page ${pngPage.pageNumber}/${pngPages.length}`)
            return txt
          }, RETRY_COUNT)
          finalText = await retryOllamaCall(async () => {
            const response2 = await fetch(`${OLLAMA_URL}/api/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': LAAMA_API_TOKEN
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
              })
            })
            if (!response2.ok) {
              const errorBody = await response2.text()
              throw new Error(`Ollama Markdown API request failed with status ${response2.status}: ${errorBody}`)
            }
            const data2 = await response2.json()
            let text = data2?.response || ''
            if (text.trim().startsWith("```markdown")) {
              text = text.replace(/^```markdown/, '').replace(/```$/, '').trim()
            }
            // Add page number to the end of the first line if it's a heading
            function appendToFirstLine(content, suffix) {
              return content.replace(/^[^\r\n]*/, (match) => match + suffix)
            }
            if (text.trim().startsWith('#')) {
              text = appendToFirstLine(text, ` (Page ${pngPage.pageNumber})`)
            }
            await fs.writeFile(existingMdPath, text, 'utf-8')
            console.log(`Job ${job.id}: markdown generation complete for page ${pngPage.pageNumber}/${pngPages.length}`)
            return text
          }, RETRY_COUNT)
        } catch (error) {
          console.warn(`Job ${job.id} VLM/Markdown failed ${RETRY_COUNT} times, falling back to PDF text for page ${pngPage.pageNumber}`, error)
          // Fallback to PDF text as Markdown
          finalText = pdfText ? `# Page ${pngPage.pageNumber}\n\n${pdfText}` : `# Page ${pngPage.pageNumber}\n\n**Page could not be processed.**`
          await fs.writeFile(existingMdPath, finalText, 'utf-8')
        }

        resultingMarkdown += `\n\n${finalText}`

      }

      const resultFileName = `${inputFileName}.md`
      const resultFilePath = path.join(outputTextDir, `${inputFileName}.md`)
      await fs.writeFile(resultFilePath, resultingMarkdown, 'utf-8')

      try {
        const resultS3Key = s3Key + '.md'
        await uploadFileToS3(s3, outputBucket, resultS3Key, resultFilePath, guessContentType(resultFilePath))
        console.log(`Job ${job.id}: uploaded results to s3://${outputBucket}/${resultFileName}`)
      } catch (err) {
        console.error('Failed uploading outputs to S3:', err)
        throw new Error(`Failed uploading outputs to s3://${outputBucket}: ${err.message || err}`)
      }

      return {
        input: { bucket: s3Bucket, key: s3Key },
        output: { bucket: outputBucket },
      }
    } finally {
      try { await fs.rm(jobRootDir, { recursive: true, force: true }) } catch { }
    }
  },
  {
    connection,
  }
)

console.log(`Worker started. Listening to queue "${QUEUE_NAME}"...`)

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed.`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})

async function shutdown() {
  console.log('Shutting down worker...')
  try { await worker.close() } catch { }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
