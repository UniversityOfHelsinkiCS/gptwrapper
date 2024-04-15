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

export const postAbortableStream = async (path: string, formData: FormData) => {
  const controller = new AbortController()

  const adminHeaders = {} as any
  const adminLoggedInAs = localStorage.getItem('adminLoggedInAs')
  if (adminLoggedInAs) {
    adminHeaders['x-admin-logged-in-as'] = adminLoggedInAs
  }

  const response = await fetch(`${PUBLIC_URL}/api/${path}`, {
    method: 'POST',
    headers: adminHeaders,
    body: formData,
    signal: controller.signal,
  })

  if (!response.ok) {
    const message = (await response.text()) || 'Something went wrong'
    throw new Error(message)
  }

  const stream = response.body as unknown as ReadableStream

  return { stream, controller }
}

export default apiClient
