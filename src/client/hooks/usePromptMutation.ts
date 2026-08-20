import { useMutation } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import type { PromptCopyParams } from '@shared/prompt'
import type { Prompt } from '../types'
import type { ApiError } from '../util/apiClient'
import { invalidateAllPromptLists, invalidatePromptLists } from '../util/promptQueries'

export type CopyPromptVariables = PromptCopyParams & {
  promptId: string
  /** SIS course id of the destination, needed to invalidate the right ['course', id] query. */
  destinationCourseId?: string
}

export const useCopyPromptMutation = () => {
  const mutationFn = async ({ promptId, ...body }: CopyPromptVariables): Promise<Prompt> => {
    const res = await apiClient.post(`/prompts/${promptId}/copy`, body)

    return res.data
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: (_prompt, variables) => {
      invalidatePromptLists(variables.destinationCourseId)
    },
    onError: (error: ApiError) => {
      if (error.response?.status === 404) invalidateAllPromptLists()
    },
  })

  return mutation
}
