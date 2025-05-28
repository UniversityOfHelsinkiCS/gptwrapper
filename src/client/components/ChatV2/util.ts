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
  prevResponseId?: string
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
  prevResponseId,
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
      prevResponseId,
    },
  }

  console.log('data', data)

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/stream/v2', formData, abortController)
}

interface GetCourseCompletionStreamProps {
  id: string
  system: string
  messages: Message[]
  model: string
  courseId: string
  abortController?: AbortController
  prevResponseId?: string
}
export const getCourseCompletionStream = async ({ id, system, messages, model, courseId, abortController, prevResponseId }: GetCourseCompletionStreamProps) => {
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
      prevResponseId,
    },
  }
  const formData = new FormData()
  formData.set('data', JSON.stringify(data))

  return postAbortableStream(`/ai/stream/v2`, formData, abortController)
}
