import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ActivityPeriod } from '../types'
import queryClient from '../util/queryClient'

interface UpdatedCourseData {
  activityPeriod: ActivityPeriod
}

export const useEditCourseMutation = (id: string) => {
  const mutationFn = async (data: UpdatedCourseData) => {
    const res = await fetch(`${PUBLIC_URL}/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const course = await res.json()

    return course
  }

  const mutation = useMutation(mutationFn, {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['course', id],
      }),
  })

  return mutation
}
