import { useMutation } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import queryClient from '../../util/queryClient'

export const useDisableCourse = () => {
  const mutationFn = async ({ id }: { id: string }) => {
    const res = await apiClient.post(`/chatinstances/${id}/disable`)
    const course = res.data
    return course
  }

  const mutation = useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chatInstances'] })
    },
  })

  return mutation
}
