import type { PostStreamSchemaV3Type } from '../../../shared/chat'
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

export const postCompletionStreamV3 = async (formData: FormData, input: PostStreamSchemaV3Type, abortController: AbortController) => {
  formData.set('data', JSON.stringify(input))

  return postAbortableStream('/ai/v3/stream', formData, abortController)
}
