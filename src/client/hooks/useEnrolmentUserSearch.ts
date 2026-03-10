import { useQuery } from '@tanstack/react-query'

import type { User } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['enrolmentUserSearch']

const useEnrolmentUserSearch = (search: string, courseId: string) => {
  const queryFn = async (): Promise<User[]> => {
    const res = await apiClient.get(`/courses/${courseId}/enrolments/users/${search}`)

    const { data } = res

    return data
  }

  const { data: users, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!(search && search.length > 4),
  })

  return { users: search && search.length > 4 ? users : [], ...rest }
}

export default useEnrolmentUserSearch
