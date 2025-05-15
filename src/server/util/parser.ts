import { APIError } from '../types'

export const isError = (response: any): response is APIError => 'error' in response
