import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import queryClient from '../util/queryClient'
import { queryKey } from './useAccessGroups'

export interface NewAccessGroupData {
  iamGroup: string
  model?: string
  usageLimit?: number
  resetCron?: string
}

export const useCreateAccessGroupMutation = () => {
  const mutationFn = async (data: NewAccessGroupData) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/accessGroups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const accessGroup = await res.json()

    return accessGroup
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}

interface UpdatedAccessGroupData {
  id: string
  iamGroup: string
  model: string
  usageLimit: number | null
  resetCron: string | null
}

export const useEditAccessGroupMutation = () => {
  const mutationFn = async (data: UpdatedAccessGroupData) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/accessGroups/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const accessGroup = await res.json()

    return accessGroup
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}

export const useDeleteAccessGroupMutation = () => {
  const mutationFn = async (id: string) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/accessGroups/${id}`, {
      method: 'DELETE',
    })

    return res
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}
