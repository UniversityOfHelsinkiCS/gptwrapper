import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Course } from '../types'

const useCourse = (courseId?: string) => {
  const queryKey = ['course', courseId]

  const queryFn = async (): Promise<Course | null> => {
    const res = await fetch(`${PUBLIC_URL}/api/courses/${courseId}`)

    const data = await res.json()

    return data
  }

  const { data: course, ...rest } = useQuery({ queryKey, queryFn })

  return { course, ...rest }
}

export default useCourse
