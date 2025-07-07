import axios, { type AxiosError } from 'axios'
import { PUBLIC_URL } from '../../config'

export type ApiError = AxiosError<{ message: string }>

const apiClient = axios.create({ baseURL: `${PUBLIC_URL}/api` })
console.log('apiClient baseURL:', apiClient.defaults.baseURL)
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

export const postAbortableStream = async (path: string, formData: FormData, externalController?: AbortController) => {
  const controller = externalController ?? new AbortController()

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

  let tokenUsageAnalysis: {
    tokenUsageWarning: boolean
    message: string
  } | null = null
  let stream: ReadableStream<Uint8Array> | null = null

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    tokenUsageAnalysis = await response.json()
  } else {
    const clonedResponse = response.clone()
    stream = clonedResponse.body
  }

  return { tokenUsageAnalysis, stream, controller }
}

export default apiClient
