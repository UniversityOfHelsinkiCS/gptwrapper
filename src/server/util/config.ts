import * as dotenv from 'dotenv'

import { inProduction } from '../../config'

dotenv.config()

export const PORT = process.env.PORT || 8000

export const API_TOKEN = process.env.API_TOKEN || ''

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export const TIKE_OPENAI_API_KEY = process.env.TIKE_OPENAI_API_KEY || ''

export const AZURE_API_KEY = process.env.AZURE_API_KEY || ''

export const AZURE_RESOURCE = process.env.AZURE_RESOURCE || ''

export const DATABASE_URL = process.env.DATABASE_URL || ''

export const JAMI_URL = inProduction
  ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/jami/'
  : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/jami'

export const PATE_URL = inProduction
  ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/pate/'
  : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/pate/'

export const IMPORTER_URL = inProduction
  ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/importer'
  : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/importer'

export const REDIS_HOST = process.env.REDIS_HOST || 'redis'

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const tikeIam = 'hy-tike-allstaff'
