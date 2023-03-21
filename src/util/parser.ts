import fs from 'fs'
import { parse } from 'jsonc-parser'

import { Service } from '../types'

export const parseServices = (): Service[] => {
  const path = './services.jsonc'
  const services = fs.readFileSync(path, 'utf8')

  return parse(services)
}
