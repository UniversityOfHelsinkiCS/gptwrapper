import { ApiError } from '../types'

// eslint-disable-next-line import/prefer-default-export
export const isError = (response: any): response is ApiError =>
  'error' in response
