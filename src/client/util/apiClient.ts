import axios, { type AxiosError } from 'axios'
import { PUBLIC_URL } from '../../config'

export type ApiError = AxiosError<{ message: string }>

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

let errorStateHandler: ((error: Error) => void) | null = null
let isHandlingError = false

export const setErrorStateHandler = (handler: (error: Error) => void) => {
  errorStateHandler = handler
}

const handleError = (error: AxiosError<{ message: string }>, isStream = false, streamMessage?: string) => {
  if (isHandlingError) {
    console.error('Error occurred while handling another error:', error)
    return
  }

  const message = streamMessage || error.response?.data?.message || error.message || 'Something went wrong'
  const customError = new Error(message)

  if (errorStateHandler) {
    try {
      isHandlingError = true
      errorStateHandler(customError)
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError)
    } finally {
      isHandlingError = false
    }
  }

  if (isStream) {
    throw customError
  }
  return Promise.reject(customError)
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => handleError(error),
)

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

  if (!response.ok) {
    const message = (await response.text()) || 'Something went wrong'
    const mockError = { response: { status: response.status } } as AxiosError<{ message: string }>
    handleError(mockError, true, message)
  }

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
