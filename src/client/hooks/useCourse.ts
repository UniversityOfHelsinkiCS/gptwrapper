import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Course } from '../types'

const useCourse = (courseId?: string, useImporter = false) => {
  const queryKey = ['course', courseId]

  if (!courseId) return { course: null, isLoading: false }

  const queryFn = async (): Promise<Course | null> => {
    const url = `${PUBLIC_URL}/api/courses/${courseId}?useImporter=${useImporter}`

    const res = await fetch(url)

    const data = await res.json()

    return data
  }

  const { data: course, ...rest } = useQuery(queryKey, queryFn)

  return { course, ...rest }
}

export default useCourse
