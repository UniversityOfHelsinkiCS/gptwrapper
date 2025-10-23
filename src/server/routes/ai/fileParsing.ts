import { extractPageText } from 'src/server/services/jobs/pdfParsing.job'
import type { ChatMessage } from '../../../shared/chat'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export const parseFileAndAddToLastMessage = async (messages: ChatMessage[], file: Express.Multer.File) => {
  let fileContent = ''

  const textFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md']
  if (textFileTypes.includes(file.mimetype)) {
    const fileBuffer = file.buffer
    fileContent = fileBuffer.toString('utf8')
  }

  if (file.mimetype === 'application/pdf') {
    const data = new Uint8Array(file.buffer)
    const loadingTask = getDocument({ data })
    const pdf = await loadingTask.promise
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      fileContent += await extractPageText(page)
    }
  }

  const messageToAddFileTo = messages[messages.length - 1]

  const updatedMessage = {
    ...messageToAddFileTo,
    content: `${messageToAddFileTo.content} ${fileContent}`,
  }

  // Remove the old message and add the new one
  messages.pop()
  messages = [...messages, updatedMessage]

  return messages
}
