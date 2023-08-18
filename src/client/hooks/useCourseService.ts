import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Service } from '../types'

const useCourseService = (courseId: string) => {
  const queryKey = ['courseService', courseId]

  const queryFn = async (): Promise<Service | null> => {
    const res = await fetch(`${PUBLIC_URL}/api/services/${courseId}`)

    const data = await res.json()

    return data
  }

  const { data: service, ...rest } = useQuery(queryKey, queryFn)

  return { service, ...rest }
}

export default useCourseService
