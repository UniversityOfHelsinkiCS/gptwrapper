import type { ChatMessage, MessageGenerationInfo } from '../../../shared/chat'
import { postAbortableStream } from '../../util/apiClient'
import type { ChatToolOutput } from '../../../shared/tools'
import { useGetQuery } from '../../hooks/apiHooks'

export const useToolResults = (toolCallId: string) => {
  return useGetQuery<ChatToolOutput | { expired: true }>({
    queryKey: ['toolResults', toolCallId],
    url: `/ai/toolResults/${toolCallId}`,
    enabled: !!toolCallId,
    retry: false,
  })
}

interface PostCompletionStreamProps {
  generationInfo: MessageGenerationInfo
  courseId?: string
  messages: ChatMessage[]
  formData: FormData
  ragIndexId?: number
  userConsent?: boolean
  modelTemperature: number
  prevResponseId?: string
  abortController?: AbortController
  saveConsent: boolean
}
export const postCompletionStreamV3 = async ({
  generationInfo,
  courseId,
  messages,
  formData,
  ragIndexId,
  userConsent,
  modelTemperature,
  prevResponseId,
  abortController,
  saveConsent,
}: PostCompletionStreamProps) => {
  const data = {
    courseId,
    options: {
      chatMessages: messages,
      systemMessage: generationInfo.promptInfo.systemMessage,
      model: generationInfo.model,
      ragIndexId,
      userConsent,
      modelTemperature,
      saveConsent,
      prevResponseId,
    },
  }

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/v3/stream', formData, abortController)
}
