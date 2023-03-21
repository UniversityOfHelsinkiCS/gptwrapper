import fs from 'fs'

import { parse } from 'jsonc-parser'

import { ApiResponse, ApiError, Service } from '../types'

export const parseServices = (): Service[] => {
  const path = './services.jsonc'
  const services = fs.readFileSync(path, 'utf8')

  return parse(services)
}

export const isError = (response: ApiResponse): response is ApiError =>
  'error' in response
