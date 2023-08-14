import { APIError } from '../types'

// eslint-disable-next-line import/prefer-default-export
export const isError = (response: any): response is APIError =>
  'error' in response
