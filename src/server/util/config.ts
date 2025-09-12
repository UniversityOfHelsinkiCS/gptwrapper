import { inProduction, inDevelopment } from '../../config'
import { getEnv } from './configHelper'

export const PORT = getEnv('PORT', '8000')

export const API_TOKEN = getEnv('API_TOKEN', 'placeholder')

export const AZURE_API_KEY = getEnv('AZURE_API_KEY', 'placeholder')

export const AZURE_RESOURCE = getEnv('AZURE_RESOURCE', 'placeholder')

export const DATABASE_URL = getEnv('DATABASE_URL', 'placeholder-this-needs-to-be-set')

export const JAMI_URL =
  inProduction || inDevelopment ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/jami/' : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/jami'

export const PATE_URL =
  inProduction || inDevelopment ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/pate/' : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/pate/'

export const IMPORTER_URL =
  inProduction || inDevelopment
    ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/importer'
    : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/importer'

export const REDIS_HOST = getEnv('REDIS_HOST', 'redis')

export const REDIS_PORT = 6379

export const BMQ_REDIS_HOST = getEnv('BMQ_REDIS_HOST', REDIS_HOST)

export const BMQ_REDIS_PORT = getEnv('BMQ_REDIS_PORT', String(REDIS_PORT))

export const BMQ_REDIS_CA = getEnv('BMQ_REDIS_CA', 'none')

export const BMQ_REDIS_CERT = getEnv('BMQ_REDIS_CERT', 'placeholder')

export const BMQ_REDIS_KEY = getEnv('BMQ_REDIS_KEY', 'placeholder')

export const UPDATER_CRON_ENABLED = process.env.UPDATER_CRON_ENABLED === 'true'

export const OLLAMA_URL = process.env.OLLAMA_URL
export const OLLAMA_EMBEDDER_MODEL = getEnv('OLLAMA_EMBEDDER_MODEL', 'placeholder')

export const LAAMA_API_URL = getEnv('LAAMA_API_URL', 'placeholder')
export const LAAMA_API_TOKEN = getEnv('LAAMA_API_TOKEN', 'placeholder')

export const S3_HOST = getEnv('S3_HOST', 'placeholder')

export const S3_ACCESS_KEY = getEnv('S3_ACCESS_KEY', 'placeholder')

export const S3_SECRET_ACCESS_KEY = getEnv('S3_SECRET_ACCESS_KEY', 'placeholder')

export const S3_BUCKET = getEnv('S3_BUCKET', 'curre-chat-dev')

export const statsViewerIams = ['hy-one', 'hy-ypa-opa-opintoasiainpaallikot']

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const basicUserIam = 'grp-currechat'

export const powerUserIam = 'grp-currechat-powerusers'

export const employeeIam = 'hy-employees'

const grandFunded = 'hy-grant-funded-researchers'

export const accessIams = [basicUserIam, powerUserIam, employeeIam, grandFunded]

export const tikeIam = 'hy-tike-allstaff'
