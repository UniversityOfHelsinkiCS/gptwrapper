import { PUBLIC_URL } from '../../../config'
import { Message } from '../../types'

export const getCompletionStream = async (
  system: string,
  messages: Message[]
) => {
  const response = await fetch(`${PUBLIC_URL}/api/ai/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'chat',
      options: {
        model: 'gpt-3.5-turbo-16k',
        messages: [
          {
            role: 'system',
            content: system,
          },
          ...messages,
        ],
        stream: true,
      },
    }),
  })

  if (!response.ok) {
    const message = (await response.text()) || 'Something went wrong'
    throw new Error(message)
  }

  const stream = response.body as unknown as ReadableStream

  return stream
}

export const sendEmail = async (to: string, text: string, subject: string) => {
  const response = await fetch(`${PUBLIC_URL}/api/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      text,
      subject,
    }),
  })

  return response
}
