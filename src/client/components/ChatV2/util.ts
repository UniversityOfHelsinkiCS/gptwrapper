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

  if (courseId) {
    return postAbortableStream(`/ai/stream/${courseId}/v2`, formData, abortController)
  } else {
    return postAbortableStream('/ai/stream/v2', formData, abortController)
  }

}