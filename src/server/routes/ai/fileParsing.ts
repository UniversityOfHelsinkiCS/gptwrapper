import { Message } from '../../../shared/llmTypes'
import { pdfToText } from '../../util/pdfToText'

export const parseFileAndAddToLastMessage = async (messages: Message[], file: Express.Multer.File) => {
  let fileContent = ''

  const textFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md']
  if (textFileTypes.includes(file.mimetype)) {
    const fileBuffer = file.buffer
    fileContent = fileBuffer.toString('utf8')
  }

  if (file.mimetype === 'application/pdf') {
    fileContent = await pdfToText(file.buffer)
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
