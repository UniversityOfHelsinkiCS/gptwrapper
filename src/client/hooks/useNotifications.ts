import { useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import type { Locales } from '@shared/types'

export type Notification = {
  id: string
  message: Locales
  startDate: string | null
  endDate: string | null
  priority: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export const notificationsQueryKey = ['notifications']
export const adminNotificationsQueryKey = ['adminNotifications']

export const useNotifications = () => {
  const queryFn = async (): Promise<Notification[]> => {
    const res = await apiClient.get('/notifications')
    return res.data
  }

  const { data: notifications, ...rest } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn,
  })

  return { notifications: notifications || [], ...rest }
}

export const useAdminNotifications = () => {
  const queryFn = async (): Promise<Notification[]> => {
    const res = await apiClient.get('/notifications/admin')
    return res.data
  }

  const { data: notifications, ...rest } = useQuery({
    queryKey: adminNotificationsQueryKey,
    queryFn,
  })

  return { notifications: notifications || [], ...rest }
}
