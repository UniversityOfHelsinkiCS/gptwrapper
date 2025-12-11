import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { MessageContent } from '../../shared/chat'
import { imageFileTypes, textFileTypes } from '../../config'

/**
 * Parse a file and return its content in the appropriate format for chat messages
 */
export const parseFileContent = async (file: File): Promise<MessageContent[] | string> => {
  // Handle text files
  if (textFileTypes.includes(file.type)) {
    const text = await file.text()
    return text
  }

  // Handle image files
  if (imageFileTypes.includes(file.type)) {
    const base64 = await fileToBase64(file)
    return [
      {
        type: 'image_url',
        image_url: {
          url: `data:${file.type};base64,${base64}`,
        },
      },
    ]
  }

  // Handle PDF files
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const loadingTask = getDocument({ data })
    const pdf = await loadingTask.promise

    if (!pdf || pdf.numPages === 0) {
      throw new Error('PDF file is empty or corrupted')
    }

    let fileContent = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join(' ')
      fileContent += pageText + '\n'
    }

    const extractedText = fileContent.trim()
    if (extractedText.length === 0) {
      throw new Error('PDF file contains no extractable text. The file may contain only images or be corrupted.')
    }

    return extractedText
  }

  throw new Error(`Unsupported file type: ${file.type}`)
}

/**
 * Convert a file to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (!reader.result || typeof reader.result !== 'string') {
        reject(new Error('Failed to read file as data URL'))
        return
      }
      const parts = reader.result.split(',')
      if (parts.length !== 2) {
        reject(new Error('Invalid data URL format'))
        return
      }
      resolve(parts[1])
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
