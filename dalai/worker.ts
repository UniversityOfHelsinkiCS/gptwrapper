import { Worker } from 'bullmq'
import dotenv from 'dotenv'
import Redis, { type RedisOptions } from 'ioredis'
import logger from './logger.ts'

dotenv.config({ path: '../.env' })

// --- Config ---

const REDIS_HOST = process.env.REDIS_HOST ?? ''
const REDIS_PORT = process.env.REDIS_PORT ?? ''
const CA = process.env.CA || undefined
const CERT = process.env.CERT ?? ''
const KEY = process.env.KEY ?? ''

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

const RETRY_COUNT = 2

const connection = new Redis(creds)

const QUEUE_NAME = process.env.LLAMA_SCAN_QUEUE ?? 'vlm-queue'
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://laama-svc:11434'

async function retryOllamaCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
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

let ACTIVE_COUNT = 0

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    ACTIVE_COUNT++
    const { bytes, pageNumber, text } = job.data || {}

    logger.info(`Processing job ${job.id}`)

    const jobId = job.id
    if (!jobId) {
      throw new Error('Job ID is missing')
    }
    let transcription = ''
    try {
      transcription = await retryOllamaCall(async () => {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'token': process.env.LAAMA_TOKEN ?? '' },
          body: JSON.stringify({
            model: 'qwen2.5vl:7b',
            system: `Objective
                    Produce the most accurate, well-structured Markdown transcription of a PDF page by combining a rasterized image of the PDF page (such as PNG or JPEG) and the parsed text extracted from the PDF.
                    Rules and Priorities
                    Treat the parsed PDF text as the primary source of truth for all textual content. If the page contains an image or diagram, provide a detailed description. If an image contains text, transcribe that text as precisely as possible. When discrepancies occur between image-derived transcription and the parsed PDF text, always prioritize the parsed PDF text. Always include image or diagram descriptions enclosed in image tags, for example: image This is an image of a cat with the caption “Feline.” image. Merge similar content from both sources to create the most comprehensive and accurate result. The final output must be clean, well-structured Markdown using headings, paragraphs, tables, emphasis, and math formatting as appropriate. Do not output anything other than Markdown, and do not wrap the entire output in a code block.
                    Step-by-Step Instructions
                    First, inspect the inputs: the rasterized image of the PDF page and the text extracted by the PDF parser. Next, detect visual content on the page. If the page contains photos, diagrams, charts, figures, or other visual elements, add a detailed description wrapped in image tags. If the image contains textual elements such as labels, captions, annotations, or scanned text, transcribe that text precisely within the description or integrate it into the main body as appropriate.
                    Then resolve the textual content. Start with the parsed PDF text as the baseline transcription. Compare it against the image-derived text; if they differ, use the parsed PDF text. If the texts are similar, merge them to improve completeness, clarity, and correctness, for example by fixing broken words, missing accents, math notation, or punctuation.
                    Preserve the document’s structure in Markdown. Reconstruct headings and subheadings for section titles, use tables where appropriate, and employ inline emphasis (bold or italics) and math formatting with ...... as needed. Maintain the logical reading order, including titles, authors, abstracts, body sections, figures, tables, and footnotes.
                    For figures, tables, and captions, place captions and references appropriately. For figures or diagrams, include an image description enclosed in image tags, and if the figure includes textual labels or legends, transcribe them accurately. If the PDF text includes a caption that differs from the image content, prefer the PDF caption while still providing a faithful description of the image.
                    Ensure quality and consistency. Remove OCR artifacts, duplicated lines, and hyphenation across line breaks. Normalize whitespace and punctuation. Render equations faithfully within ...... when present. Correct obvious transcription errors, always prioritizing the parsed PDF text.
                    Output Requirements
                    Produce only Markdown, with no extra commentary. Include image descriptions wrapped with image and image tags if any visual content exists. Deliver a cohesive, readable, and accurate transcription that reflects the parsed PDF as the source of truth, enhanced by precise and detailed information derived from the image`,
            prompt: `Parsed PDF text:\n${text}\n\nImage transcription:`,
            stream: false,
            images: [bytes]
          }),
        })
        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`)
        }
        const data = await response.json()
        let txt = data?.response || ''
        if (txt.trim().startsWith('```markdown')) {
          txt = txt
            .replace(/^```markdown/, '')
            .replace(/```$/, '')
            .trim()
        }
        logger.info(`Job ${job.id}: transcription complete for page ${pageNumber}`)

        return txt
      }, RETRY_COUNT)
    } catch (error) {
      logger.error(`Job ${job.id}: transcription got error: ${error}`)
    }
    return transcription
  },
  {
    connection
  },
)

logger.info(`Worker started. Listening to queue "${QUEUE_NAME}"...`)

worker.on('completed', (job, result) => {
  ACTIVE_COUNT--
  logger.info(`Job ${job.id} completed.`)
})

worker.on('failed', (job, err) => {
  ACTIVE_COUNT--
  logger.error(`Job ${job?.id} failed:`, err)
})

async function shutdown() {
  logger.info('Shutting down worker...')
  try {
    if (ACTIVE_COUNT <= 0) await worker.close()
  } catch { }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
