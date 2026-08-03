import { useMutation } from '@tanstack/react-query'

import type { ActivityPeriod } from '../types'
import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'

interface UpdatedCourseData {
  activityPeriod: ActivityPeriod
  usageLimit: number
  saveDiscussions: boolean
}

interface SaveDiscussionsVariables {
  chatId: string
  saveDiscussions: boolean
}

export const useEditCourseMutation = (id: string) => {
  const mutationFn = async (data: UpdatedCourseData) => {
    const res = await apiClient.put(`/courses/${id}`, data)

    const course = res.data

    return course
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['course', id],
      }),
  })

  return mutation
}

export const useSaveDiscussionsMutation = () => {
  const mutationFn = async ({ chatId, saveDiscussions }: SaveDiscussionsVariables) => {
    const res = await apiClient.put(`/courses/${chatId}`, {
      saveDiscussions,
    })

    return res.data
  }

  return useMutation({
    mutationFn,
    onSuccess: async (_data, { chatId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['statistics'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['course', chatId],
        }),
      ])
    },
  })
}
