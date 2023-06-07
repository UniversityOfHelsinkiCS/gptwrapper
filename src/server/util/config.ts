import * as dotenv from 'dotenv'

import { inProduction } from '../../config'

dotenv.config()

export const PORT = process.env.PORT || 8000

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export const TIKE_OPENAI_API_KEY = process.env.TIKE_OPENAI_API_KEY || ''

export const DATABASE_URL = process.env.DATABASE_URL || ''

export const PATE_URL = inProduction
  ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/pate/'
  : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/pate/'

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const globalCampusIam = 'grp-curregc'

const curregptIam = 'grp-curregpt'

export const doubleUsageIams = [globalCampusIam, curregptIam]

export const tikeIam = 'tike'

export const accessIams = [
  globalCampusIam,
  curregptIam,
  'hy-ypa-opa-henkilosto',
  tikeIam,
]
