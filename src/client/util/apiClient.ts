import axios, { AxiosRequestHeaders, type AxiosError } from 'axios'
import { PUBLIC_URL } from '../../config'

export type ApiError = AxiosError<{ message: string }>

const apiClient = axios.create({ baseURL: `${PUBLIC_URL}/api` })
console.log('apiClient baseURL:', apiClient.defaults.baseURL)
export const updaterApiClient = axios.create({
  baseURL: `${PUBLIC_URL}/updater/api`,
})

const getCustomHeaders = () => {
  const headers = {} as AxiosRequestHeaders

  const adminLoggedInAs = localStorage.getItem('adminLoggedInAs') // id
  if (adminLoggedInAs) {
    headers['x-admin-logged-in-as'] = adminLoggedInAs
  }
  return headers
}

apiClient.interceptors.request.use((config) => {
  const newConfig = { ...config, headers: getCustomHeaders() }

  return newConfig
})

export const postAbortableStream = async (path: string, formData: FormData, externalController?: AbortController) => {
  const controller = externalController ?? new AbortController()

  const response = await fetch(`${PUBLIC_URL}/api/${path}`, {
    method: 'POST',
    headers: getCustomHeaders(),
    body: formData,
    signal: controller.signal,
  })

  let tokenUsageAnalysis: {
    tokenUsageWarning: boolean
    message: string
  } | null = null
  let stream: ReadableStream<Uint8Array> | null = null

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    const json = await response.json()
    if (!('error' in json)) {
      tokenUsageAnalysis = json
    }
  } else {
    const clonedResponse = response.clone()
    stream = clonedResponse.body
  }

  return { tokenUsageAnalysis, stream, controller }
}

export default apiClient
