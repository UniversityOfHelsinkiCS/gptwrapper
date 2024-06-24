import { useQuery } from '@tanstack/react-query'

import { ChatInstanceUsage } from '../types'
import apiClient from '../util/apiClient'

const useCourseUsage = (courseId?: string) => {
  const queryKey = ['courseUsage', courseId]

  const queryFn = async (): Promise<ChatInstanceUsage[] | null> => {
    const res = await apiClient.get(`/courses/usage/${courseId}`)

    const { data } = res

    return data
  }

  const { data: chatInstanceUsages, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })

  return { chatInstanceUsages, ...rest }
}

export default useCourseUsage
