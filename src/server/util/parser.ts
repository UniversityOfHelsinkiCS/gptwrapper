import { ApiResponse, ApiError } from '../types'

// eslint-disable-next-line import/prefer-default-export
export const isError = (response: ApiResponse): response is ApiError =>
  'error' in response
