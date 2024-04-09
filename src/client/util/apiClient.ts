import axios from 'axios'
import { PUBLIC_URL } from '../../config'

const apiClient = axios.create({ baseURL: `${PUBLIC_URL}/api` })
export const updaterApiClient = axios.create({
  baseURL: `${PUBLIC_URL}/updater/api`,
})

apiClient.interceptors.request.use((config) => {
  const headers = {} as any

  const adminLoggedInAs = localStorage.getItem('adminLoggedInAs') // id
  if (adminLoggedInAs) {
    headers['x-admin-logged-in-as'] = adminLoggedInAs
  }

  const newConfig = { ...config, headers }

  return newConfig
})

export default apiClient
