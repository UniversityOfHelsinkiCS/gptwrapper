import { useMutation } from '@tanstack/react-query'

import { InfoText } from '../types'
import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'

export const useEditInfoTextMutation = () => {
  const mutationFn = async (data: InfoText) => {
    const res = await apiClient.put(`/admin/info-texts/${data.id}`, data)
    const infoText = res.data
    return infoText
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['infoTexts'],
      }),
  })

  return mutation
}
