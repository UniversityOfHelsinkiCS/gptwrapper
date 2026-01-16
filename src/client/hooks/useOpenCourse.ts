import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import apiClient from '../util/apiClient'
import { Course } from '../types'
import { CoursesViewCourse } from './useUserCourses'
import { DEFAULT_TOKEN_LIMIT } from '../../config'

const useOpenCourse = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const mutationFn = async (course: CoursesViewCourse | Course) => {
    await apiClient.put(`/courses/${course.courseId}`, {
      usageLimit: DEFAULT_TOKEN_LIMIT,
    })

    return course
  }

  const { mutate, ...rest } = useMutation({
    mutationFn,
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['chatInstances', 'user'] })
      queryClient.invalidateQueries({ queryKey: ['course', course.courseId] })
      enqueueSnackbar(t('course:courseActivated'), { variant: 'success' })
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('common:fetchError'), { variant: 'error' })
      console.error(error)
    },
  })

  return { openCourse: mutate, ...rest }
}

export default useOpenCourse
