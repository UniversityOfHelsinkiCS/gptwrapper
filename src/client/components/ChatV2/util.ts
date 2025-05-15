import { Message } from '../../types'
import { postAbortableStream } from '../../util/apiClient'

interface GetCompletoinStreamProps {
  system: string
  messages: Message[]
  model: string
  formData: FormData
  userConsent: boolean
  modelTemperature: number
  courseId?: string
  abortController?: AbortController
  saveConsent: boolean
}
export const getCompletionStream = async ({
  system,
  messages,
  model,
  formData,
  userConsent,
  modelTemperature,
  courseId,
  abortController,
  saveConsent,
}: GetCompletoinStreamProps) => {
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
      saveConsent,
    },
  }

  console.log('data', data)

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/stream', formData, abortController)
}

interface GetCourseCompletionStreamProps {
  id: string
  system: string
  messages: Message[]
  model: string
  courseId: string
  abortController?: AbortController
}
export const getCourseCompletionStream = async ({ id, system, messages, model, courseId, abortController }: GetCourseCompletionStreamProps) => {
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

  return postAbortableStream(`/ai/stream/`, formData, abortController)
}
