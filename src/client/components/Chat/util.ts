import { Message } from '../../types'
import { postAbortableStream } from '../../util/apiClient'

export const getCompletionStream = async (
  system: string,
  messages: Message[],
  model: string,
  formData: FormData,
  userConsent: boolean,
  modelTemperature: number,
  courseId?: string
) => {
  const data = {
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
      userConsent,
      modelTemperature,
    },
  }

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/stream', formData)
}

export const getCourseCompletionStream = async (
  id: string,
  system: string,
  messages: Message[],
  model: string,
  courseId: string
) => {
  const data = {
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
  }
  const formData = new FormData()
  formData.set('data', JSON.stringify(data))

  return postAbortableStream(`/ai/stream/`, formData)
}
