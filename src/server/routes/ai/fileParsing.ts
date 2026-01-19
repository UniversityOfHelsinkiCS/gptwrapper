import { extractPageText } from 'src/server/services/jobs/pdfParsing.job'
import type { ChatMessage, MessageContent } from '../../../shared/chat'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import logger from 'src/server/util/logger'
import { ApplicationError } from 'src/server/util/ApplicationError'
import { imageFileTypes, textFileTypes } from '../../../config'

export { imageFileTypes }
export const parseFileAndAddToLastMessage = async (messages: ChatMessage[], file: Express.Multer.File) => {
export const imageFileTypes = ['image/jpeg', 'image/png']

const PDF_PROGRESS_UPDATE_INTERVAL = 5

type ProgressCallback = (message: string) => Promise<void>

export const parseFileAndAddToLastMessage = async (
  messages: ChatMessage[],
  file: Express.Multer.File,
  onProgress?: ProgressCallback
) => {
  let fileContent: MessageContent[] | string = ''

  if (textFileTypes.includes(file.mimetype)) {
    const fileBuffer = file.buffer
    fileContent = fileBuffer.toString('utf8')
  }


  if (imageFileTypes.includes(file.mimetype)) {
    //Openai supports different types of image inputs,
    // read the image content part of langchain: https://docs.langchain.com/oss/python/langchain/messages#message-content
    //this is the openai specific: https://platform.openai.com/docs/guides/images-vision?api-mode=responses&format=base64-encoded
    const image = file.buffer.toString('base64')
    const imageAsFileContent = {
      type: "image_url",
      image_url: {
        url: `data:${file.mimetype};base64,${image}`
      },
    }

    const messageToAddFileTo = messages[messages.length - 1]
    fileContent = [imageAsFileContent]
  }

  if (file.mimetype === 'application/pdf') {
    try {
      const data = new Uint8Array(file.buffer)
      const loadingTask = getDocument({ data })
      const pdf = await loadingTask.promise

      if (!pdf || pdf.numPages === 0) {
        logger.error('PDF parsing failed: PDF has no pages', { filename: file.originalname })
        throw ApplicationError.BadRequest('PDF file is empty or corrupted')
      }

      // Send initial progress update
      if (onProgress) {
        await onProgress(`Parsing PDF (${pdf.numPages} pages)...`)
      }

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const pageText = await extractPageText(page)
        fileContent += pageText

        if (onProgress && (i % PDF_PROGRESS_UPDATE_INTERVAL === 0 || i === pdf.numPages)) {
          await onProgress(`Parsed ${i} of ${pdf.numPages} pages...`)
        }
      }

      const extractedText = fileContent as string
      if (extractedText.trim().length === 0) {
        logger.error('PDF parsing completed but extracted no text', { filename: file.originalname, numPages: pdf.numPages })
        throw ApplicationError.BadRequest('PDF file contains no extractable text. The file may contain only images or be corrupted.', {
          extra: { filename: file.originalname, numPages: pdf.numPages }
        })
      }
    } catch (error) {
      logger.error('Error parsing PDF file', {
        error: error instanceof Error ? error.message : String(error),
        filename: file.originalname,
        fileSize: file.size
      })

      if (error instanceof ApplicationError) {
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        throw ApplicationError.BadRequest('PDF file is password-protected or encrypted')
      } else if (errorMessage.includes('invalid') || errorMessage.includes('corrupt')) {
        throw ApplicationError.BadRequest('PDF file is invalid or corrupted')
      } else {
        throw ApplicationError.BadRequest('Failed to parse PDF file. Please ensure the file is a valid PDF.')
      }
    }
  }

  const messageToAddFileTo = messages[messages.length - 1]

  const content: MessageContent[] | string = imageFileTypes.includes(file.mimetype) ? fileContent : `${messageToAddFileTo.content} ${fileContent as string}`

  const updatedMessage: ChatMessage = {
    ...messageToAddFileTo,
    content: content,
  }

  messages.pop()
  messages = [...messages, updatedMessage]

  return messages
}
