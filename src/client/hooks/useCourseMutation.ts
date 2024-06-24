import { useMutation } from '@tanstack/react-query'

import { ActivityPeriod } from '../types'
import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'

interface UpdatedCourseData {
  activityPeriod: ActivityPeriod
  model: string
  usageLimit: number
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
