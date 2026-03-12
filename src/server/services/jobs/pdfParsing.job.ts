import { getDocument, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { ApplicationError } from 'src/server/util/ApplicationError'
import logger from 'src/server/util/logger'
import type { RagFile } from '../../db/models'
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
  for (const item of textContent.items) {
    if ('str' in item && typeof (item as TextItem).str === 'string' && item.str.length > 0) {
      parts.push(item.str)
    }
  }
  const text = parts.join(' ')
  return fixAakkoset(text.trim())
}

export type PageInfo = {
  text: string
  png: Uint8Array
}

type RenderCanvasAndContext = {
  canvas: {
    toBuffer: (mimeType: 'image/png') => Buffer
  }
  context: CanvasRenderingContext2D
}

export const analyzeAndPreparePDFPages = async (pdfBytes: Uint8Array, scale = 2.0) => {
  //scale at 2.0 to keep closer to 200dpi which is ideal for vlms
  try {
    const loadingTask = getDocument({ data: pdfBytes })
    const pdf = await loadingTask.promise
    const pageCount = pdf.numPages

    if (pageCount > 100) {
      logger.error('PDF parsing failed: PDF has too many pages.')
      throw ApplicationError.BadRequest('PDF file has too many pages. Max page count is 100.')
    }

    const pageInfo: PageInfo[] = []

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)

      const viewport = page.getViewport({ scale })
      const canvasFactory = pdf.canvasFactory as { create: (width: number, height: number) => RenderCanvasAndContext }
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

      await page.render({
        canvas: null,
        canvasContext: canvasAndContext.context,
        viewport,
      }).promise
      const pngBuffer = canvasAndContext.canvas.toBuffer('image/png')

      const text = await extractPageText(page)
      pageInfo.push({
        text,
        png: new Uint8Array(pngBuffer),
      })
    }

    return pageInfo
  } catch (error) {
    logger.error(error)
    throw error
  }
}

const isImage = (ragFile: RagFile) => ragFile.fileType === 'image/png'

export const simplyParsePdf = async (ragFile: RagFile) => {
  const pdfBytes = await FileStore.readRagFileContextToBytes(ragFile)

  if (!pdfBytes) {
    console.error(`Failed to read PDF text file ${ragFile.filename} in S3`)
    throw ApplicationError.InternalServerError('Failed to read PDF text file')
  }
  const pages = await analyzeAndPreparePDFPages(pdfBytes)

  return pages
}

export const preparePagesForAdvancedParsing = async (ragFile: RagFile) => {
  const fileBytes = await FileStore.readRagFileContextToBytes(ragFile)

  if (!fileBytes) {
    console.error(`Failed to read file ${ragFile.filename} in S3`)
    throw ApplicationError.InternalServerError('Failed to read file')
  }

  return isImage(ragFile) ? [{ text: '', png: fileBytes } satisfies PageInfo] : analyzeAndPreparePDFPages(fileBytes)
}
