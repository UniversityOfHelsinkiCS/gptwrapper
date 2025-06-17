import { RagIndexAttributes } from '../../../shared/types'
import { Message } from '../../types'
import { postAbortableStream } from '../../util/apiClient'

interface GetCompletoinStreamProps {
  courseId?: string
  assistantInstructions: string
  messages: Message[]
  model: string
  formData: FormData
  ragIndexId?: number
  userConsent: boolean
  modelTemperature: number
  prevResponseId?: string
  abortController?: AbortController
  saveConsent: boolean
}
export const getCompletionStream = async ({
  courseId,
  assistantInstructions,
  messages,
  model,
  formData,
  ragIndexId,
  userConsent,
  modelTemperature,
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
          content: assistantInstructions,
        },
        ...messages,
      ],
      assistantInstructions,
      ragIndexId,
      model,
      userConsent,
      modelTemperature,
      saveConsent,
      prevResponseId,
    },
  }

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/stream/v2', formData, abortController)
}
