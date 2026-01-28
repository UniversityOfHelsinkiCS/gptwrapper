import { useMutation } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import queryClient from '../util/queryClient'
import { adminNotificationsQueryKey, notificationsQueryKey, type Notification } from './useNotifications'
import type { Locales } from '@shared/types'

type NotificationCreateParams = {
  message: Locales
  startDate?: string | null
  endDate?: string | null
  priority?: number
  active?: boolean
}

type NotificationUpdateParams = NotificationCreateParams & {
  id: string
}

export const useCreateNotificationMutation = () => {
  const mutationFn = async (data: NotificationCreateParams) => {
    const res = await apiClient.post<Notification>('/notifications/admin', data)
    return res.data
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationsQueryKey })
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })

  return mutation
}

export const useUpdateNotificationMutation = () => {
  const mutationFn = async (data: NotificationUpdateParams) => {
    const { id, ...updateData } = data
    const res = await apiClient.put<Notification>(`/notifications/admin/${id}`, updateData)
    return res.data
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationsQueryKey })
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })

  return mutation
}

export const useDeleteNotificationMutation = () => {
  const mutationFn = async (id: string) => {
    await apiClient.delete(`/notifications/admin/${id}`)
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationsQueryKey })
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })

  return mutation
}
