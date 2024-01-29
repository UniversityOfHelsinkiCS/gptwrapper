import { PUBLIC_URL } from '../../../config'
import { Message } from '../../types'

export const getCompletionStream = async (
  id: string,
  system: string,
  messages: Message[],
  model: string,
  courseId?: string
) => {
  const controller = new AbortController()

  const response = await fetch(`${PUBLIC_URL}/api/ai/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      courseId,
      options: {
        messages: [
          {
            role: 'system',
            content: system,
          },
          ...messages,
        ],
        model,
      },
    }),
    signal: controller.signal,
  })

  if (!response.ok) {
    const message = (await response.text()) || 'Something went wrong'
    throw new Error(message)
  }

  const stream = response.body as unknown as ReadableStream

  return { stream, controller }
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
