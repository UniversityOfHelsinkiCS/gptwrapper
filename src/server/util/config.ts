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

export const UPDATER_CRON_ENABLED = process.env.UPDATER_CRON_ENABLED === 'true'

export const OLLAMA_URL = getEnv('OLLAMA_URL', 'http://ollama:11434/v1/')

export const LAAMA_API_URL = getEnv('LAAMA_API_URL', 'placeholder')
export const LAAMA_API_TOKEN = getEnv('LAAMA_API_TOKEN', 'placeholder')

export const statsViewerIams = ['hy-one', 'hy-ypa-opa-opintoasiainpaallikot']

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const basicUserIam = 'grp-currechat'

export const powerUserIam = 'grp-currechat-powerusers'

export const employeeIam = 'hy-employees'

const grandFunded = 'hy-grant-funded-researchers'

export const accessIams = [basicUserIam, powerUserIam, employeeIam, grandFunded]

export const tikeIam = 'hy-tike-allstaff'

export const DEFAULT_RAG_SYSTEM_PROMPT = `
You are a helpful AI assistant designed to answer questions related to the course material, which you can access using the file search tool. Your responses should be concise, relevant, and based on the provided course files.
If you cannot find the answer in the files, you should indicate that you do not have enough information to answer the question.
You can still give your best guess based on your training, but make it clear that the answer is not based on the course material.
`
