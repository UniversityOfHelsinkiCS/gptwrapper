import { Message } from '../../types'
import { postAbortableStream } from '../../util/apiClient'

export const getCompletionStream = async (
  system: string,
  messages: Message[],
  model: string,
  formData: FormData
) => {
  const data = {
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
  }

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/stream', formData)
}
