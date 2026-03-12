import logger from 'src/server/util/logger'
import { ApplicationError } from 'src/server/util/ApplicationError'
import { OLLAMA_URL, OLLAMA_VISION_MODEL } from '../../util/config'

const systemPrompt = `Objective
Produce the most accurate, well-structured Markdown transcription of a PDF page by combining a rasterized image of the PDF page (such as PNG or JPEG) and the parsed text extracted from the PDF.
Rules and Priorities
Treat the parsed PDF text as the primary source of truth for all textual content. If the page contains an image or diagram, provide a detailed description. If an image contains text, transcribe that text as precisely as possible. When discrepancies occur between image-derived transcription and the parsed PDF text, always prioritize the parsed PDF text. Always include image or diagram descriptions enclosed in <image> tags, for example: <image>This is an image of a cat with the caption “Feline.”</image>. Merge similar content from both sources to create the most comprehensive and accurate result. The final output must be clean, well-structured Markdown using headings, paragraphs, tables, emphasis, and math formatting as appropriate. Do not output anything other than Markdown, and do not wrap the entire output in a code block.
Step-by-Step Instructions
First, inspect the inputs: the rasterized image of the PDF page and the text extracted by the PDF parser. Next, detect visual content on the page. If the page contains photos, diagrams, charts, figures, or other visual elements, add a detailed description wrapped in <image> tags. If the image contains textual elements such as labels, captions, annotations, or scanned text, transcribe that text precisely within the description or integrate it into the main body as appropriate.
Then resolve the textual content. Start with the parsed PDF text as the baseline transcription. Compare it against the image-derived text; if they differ, use the parsed PDF text. If the texts are similar, merge them to improve completeness, clarity, and correctness, for example by fixing broken words, missing accents, math notation, or punctuation.
Preserve the document’s structure in Markdown. Reconstruct headings and subheadings for section titles, use tables where appropriate, and employ inline emphasis (bold or italics) and math formatting with $$...$$ as needed. Maintain the logical reading order, including titles, authors, abstracts, body sections, figures, tables, and footnotes.
For figures, tables, and captions, place captions and references appropriately. For figures or diagrams, include an image description enclosed in <image> tags, and if the figure includes textual labels or legends, transcribe them accurately. If the PDF text includes a caption that differs from the image content, prefer the PDF caption while still providing a faithful description of the image.
Ensure quality and consistency. Remove OCR artifacts, duplicated lines, and hyphenation across line breaks. Normalize whitespace and punctuation. Render equations faithfully within $$...$$ when present. Correct obvious transcription errors, always prioritizing the parsed PDF text.
Output Requirements
Produce only Markdown, with no extra commentary. Include image descriptions wrapped with <image> and </image> tags if any visual content exists. Deliver a cohesive, readable, and accurate transcription that reflects the parsed PDF as the source of truth, enhanced by precise and detailed information derived from the image`

type DirectOllamaPageParseArgs = {
  pageNumber: number
  pngBase64: string
  extractedText?: string
  ollamaUrl?: string
}

type OllamaGenerateResponse = {
  response?: string
  total_duration?: number
  load_duration?: number
  prompt_eval_duration?: number
  eval_duration?: number
}

const stripMarkdownFences = (txt: string) => {
  let out = txt.trim()

  if (out.startsWith('```markdown')) {
    out = out
      .replace(/^```markdown/, '')
      .replace(/```$/, '')
      .trim()
  } else if (out.startsWith('```')) {
    out = out.replace(/^```/, '').replace(/```$/, '').trim()
  }

  return out
}

const toMilliseconds = (durationNs?: number) => (durationNs ?? 0) / 1_000_000

const getGenerateUrl = (url: string) => {
  if (!url) {
    throw ApplicationError.InternalServerError('OLLAMA_URL must be configured for advanced parsing')
  }

  const normalized = url.endsWith('/') ? url.slice(0, -1) : url

  if (normalized.endsWith('/api/generate')) return normalized
  if (normalized.endsWith('/api')) return `${normalized}/generate`
  return `${normalized}/api/generate`
}

export const parsePageWithDirectOllama = async ({ pageNumber, pngBase64, extractedText, ollamaUrl = OLLAMA_URL }: DirectOllamaPageParseArgs) => {
  const generateUrl = getGenerateUrl(ollamaUrl ?? '')
  const wallClockStart = Date.now()

  const response = await fetch(generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_VISION_MODEL,
      system: systemPrompt,
      prompt: `Parsed PDF text:\n${extractedText ?? ''}\n\nImage transcription:`,
      stream: false,
      images: [pngBase64],
      options: { num_ctx: 8192 },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`)
  }


  const data = (await response.json()) as OllamaGenerateResponse
  const durationMs = Date.now() - wallClockStart

  logger.info('Direct Ollama page parse completed', {
    pageNumber,
    durationMs,
    ollamaDurationMs: toMilliseconds(data.total_duration),
    ollamaLoadDurationMs: toMilliseconds(data.load_duration),
    ollamaPromptEvalDurationMs: toMilliseconds(data.prompt_eval_duration),
    ollamaEvalDurationMs: toMilliseconds(data.eval_duration),
    extractedTextLength: extractedText?.length ?? 0,
    model: OLLAMA_VISION_MODEL,
    ollamaUrl: generateUrl,
  })

  return stripMarkdownFences(data.response ?? '')
}
