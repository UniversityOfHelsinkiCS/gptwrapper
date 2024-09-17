import * as dotenv from 'dotenv'

import { inProduction, inDevelopment } from '../../config'

dotenv.config()

export const PORT = process.env.PORT || 8000

export const API_TOKEN = process.env.API_TOKEN || ''

export const { CURRE_API_PASSWORD } = process.env

export const TIKE_OPENAI_API_KEY = process.env.TIKE_OPENAI_API_KEY || ''

export const AZURE_API_KEY = process.env.AZURE_API_KEY || ''

export const AZURE_RESOURCE = process.env.AZURE_RESOURCE || ''

export const DATABASE_URL = process.env.DATABASE_URL || ''

export const JAMI_URL =
  inProduction || inDevelopment
    ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/jami/'
    : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/jami'

export const PATE_URL =
  inProduction || inDevelopment
    ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/pate/'
    : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/pate/'

export const IMPORTER_URL =
  inProduction || inDevelopment
    ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/importer'
    : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/importer'

export const REDIS_HOST = process.env.REDIS_HOST || 'redis'

export const statsViewerIams = ['hy-one']

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const basicUserIam = 'grp-currechat'

export const powerUserIam = 'grp-currechat-powerusers'

export const employeeIam = 'hy-employees'

export const accessIams = [basicUserIam, powerUserIam, employeeIam]

export const tikeIam = 'hy-tike-allstaff'

export const TEST_COURSE_ID = 'test-course'

export const EXAMPLE_COURSE_ID = 'esimerkit'

export const TEST_USER_IDS = [
  'hy-hlo-95971222',
  'hy-hlo-1442996',
  'otm-688bac31-4ddf-4b81-a562-6cea8260262a',
  'hy-hlo-129129327',
  'hy-hlo-45702058',
  'hy-hlo-1397482',
]
