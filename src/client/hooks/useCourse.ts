import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Service } from '../types'

const useCourse = (courseId?: string) => {
  const queryKey = ['courseService', courseId]

  if (!courseId) return { service: null, isLoading: false }

  const queryFn = async (): Promise<Service | null> => {
    const res = await fetch(`${PUBLIC_URL}/api/courses/${courseId}`)

    const data = await res.json()

    return data
  }

  const { data: service, ...rest } = useQuery(queryKey, queryFn)

  return { service, ...rest }
}

export default useCourse
