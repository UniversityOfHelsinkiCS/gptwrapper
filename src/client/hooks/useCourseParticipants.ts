import { useQuery } from '@tanstack/react-query'

import type { CourseParticipantsResponse } from '../../shared/types'
import apiClient from '../util/apiClient'

const useCourseParticipants = (courseId?: string) => {
  const queryKey = ['courseParticipants', courseId]

  const queryFn = async (): Promise<CourseParticipantsResponse> => {
    const res = await apiClient.get(`/admin/courses/${courseId}/participants`)

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
    retry: false,
  })

  return { data, ...rest }
}

export default useCourseParticipants
