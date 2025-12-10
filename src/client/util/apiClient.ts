import axios, { AxiosRequestHeaders, type AxiosError } from 'axios'
import { PUBLIC_URL } from '../../config'
import { AiApiResponse } from '@shared/aiApi'

export type ApiError = AxiosError<{ message: string }>

const apiClient = axios.create({ baseURL: `${PUBLIC_URL}/api` })

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

export const postAbortableStream = async (path: string, formData: FormData, externalController?: AbortController): Promise<AiApiResponse & { controller: AbortController }> => {
  const controller = externalController ?? new AbortController()

  const response = await fetch(`${PUBLIC_URL}/api/${path}`, {
    method: 'POST',
    headers: getCustomHeaders(),
    body: formData,
    signal: controller.signal,
  })

  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    const json = await response.json()
    if ("warnings" in json) {
      return {
        ...json,
        controller,
      }
    } else {
      return {
        ...json,
        error: json.error || 'Unknown error from server',
        controller,
      }
    }
  } else if (contentType?.includes('text/event-stream')) {
    return {
      stream: response.body as ReadableStream<Uint8Array>,
      controller,
    }
  }

  return {
    error: 'Unknown response from server',
    controller,
  }
}

export default apiClient
