import { PUBLIC_URL } from '../../../config'
import { Message } from '../../types'

export const getCompletionStream = async (
  system: string,
  messages: Message[],
  model: string,
  formData: FormData
) => {
  const controller = new AbortController()

  const str = JSON.stringify({
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
  })

  formData.set('options', str)

  const response = await fetch(`${PUBLIC_URL}/api/ai/stream`, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  })

  if (!response.ok) {
    const message = (await response.text()) || 'Something went wrong'
    throw new Error(message)
  }

  const stream = response.body as unknown as ReadableStream

  return { stream, controller }
}
