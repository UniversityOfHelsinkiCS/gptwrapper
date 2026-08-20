import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'
import type { PromptEditableParams, PromptCreationParams, PromptCopyParams } from '@shared/prompt'
import type { Prompt } from '../types'
import type { ApiError } from '../util/apiClient'

export const useCreatePromptMutation = () => {
  const mutationFn = async (data: Omit<PromptCreationParams, 'userId'>) => {
    const res = await apiClient.post(`/prompts`, data)

    const prompt = res.data

    return prompt
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateAllPromptLists()
    },
  })

  return mutation
}

export const useDeletePromptMutation = () => {
  const mutationFn = async (id: string) => {
    const res = await apiClient.delete(`/prompts/${id}`)

    return res
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateAllPromptLists()
    },
  })

  return mutation
}

export type CopyPromptVariables = PromptCopyParams & {
  promptId: string
  /** SIS course id of the destination, needed to invalidate the right ['course', id] query. */
  destinationCourseId?: string
}

const invalidatePromptLists = (destinationCourseId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['/prompts/my-prompts'] })
  queryClient.invalidateQueries({ queryKey: ['chatInstances', 'user'] })
  if (destinationCourseId) queryClient.invalidateQueries({ queryKey: ['course', destinationCourseId] })
}

const invalidateAllPromptLists = () => {
  queryClient.invalidateQueries({ queryKey: ['/prompts/my-prompts'] })
  queryClient.invalidateQueries({ queryKey: ['chatInstances', 'user'] })
  queryClient.invalidateQueries({ queryKey: ['course'] })
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

export const useEditPromptMutation = () => {
  const mutationFn = async (data: PromptEditableParams & { id: string }) => {
    const res = await apiClient.put(`/prompts/${data.id}`, data)
    const prompt = res.data
    return prompt
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateAllPromptLists()
    },
  })

  return mutation
}
