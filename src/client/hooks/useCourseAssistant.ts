import { useQuery } from '@tanstack/react-query'
import { CourseAssistant } from '../../shared/types'

export const useCourseAssistant = (courseId: string | null) => {
  const queryKey = ['courseAssistant', courseId]

  const { data: courseAssistant, ...rest } = useQuery<CourseAssistant>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/assistants/for-course/${courseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch course assistant')
      }
      return response.json()
    },
    enabled: !!courseId,
    retry: false,
  })

  return {
    courseAssistant,
    ...rest,
  }
}
