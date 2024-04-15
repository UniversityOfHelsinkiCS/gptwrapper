import { useQuery } from '@tanstack/react-query'

import { Course } from '../types'
import apiClient from '../util/apiClient'

const useUserCourses = ({
  limit,
  offset,
}: {
  limit: number
  offset: number
}) => {
  const queryKey = ['chatInstances', { limit, offset }]

  const queryFn = async (): Promise<{ courses: Course[]; count: number }> => {
    const res = await apiClient.get(
      `/courses/user?limit=${limit}&offset=${offset}`
    )

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
  })

  return { courses: data?.courses || [], count: data?.count, ...rest }
}

export default useUserCourses
