import { inProduction, inDevelopment } from '../../config'

export const PORT = process.env.PORT || 8000

export const API_TOKEN = process.env.API_TOKEN || ''

export const { CURRE_API_PASSWORD } = process.env

export const TIKE_OPENAI_API_KEY = process.env.TIKE_OPENAI_API_KEY || ''

export const AZURE_API_KEY = process.env.AZURE_API_KEY || ''

export const AZURE_RESOURCE = process.env.AZURE_RESOURCE || ''

export const DATABASE_URL = process.env.DATABASE_URL || 'placeholder-this-needs-to-be-set'

export const JAMI_URL =
  inProduction || inDevelopment ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/jami/' : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/jami'

export const PATE_URL =
  inProduction || inDevelopment ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/pate/' : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/pate/'

export const IMPORTER_URL =
  inProduction || inDevelopment ? 'https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/importer' : 'https://api-toska.apps.ocp-test-0.k8s.it.helsinki.fi/importer'

export const REDIS_HOST = process.env.REDIS_HOST || 'redis'

export const statsViewerIams = ['hy-one', 'hy-ypa-opa-opintoasiainpaallikot']

export const adminIams = ['grp-toska', 'hy-ypa-opa-ote']

export const basicUserIam = 'grp-currechat'

export const powerUserIam = 'grp-currechat-powerusers'

export const employeeIam = 'hy-employees'

const grandFunded = 'hy-grant-funded-researchers'

export const accessIams = [basicUserIam, powerUserIam, employeeIam, grandFunded]

export const tikeIam = 'hy-tike-allstaff'

export const TEST_COURSES = {
  OTE_SANDBOX: {
    id: 'sandbox',
    name: {
      en: 'OTE sandbox',
      sv: 'OTE sandbox',
      fi: 'OTE:n hiekkalaatikko',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2026-08-31',
    },
    code: 'OTE-1234',
  },
  TEST_COURSE: { id: 'test-course' },
  EXAMPLE_COURSE: { id: 'esimerkit' },
}

export const TEST_USER_IDS = ['hy-hlo-95971222', 'hy-hlo-1442996', 'otm-688bac31-4ddf-4b81-a562-6cea8260262a', 'hy-hlo-129129327', 'hy-hlo-45702058', 'hy-hlo-1397482']

export const DEFAULT_RAG_SYSTEM_PROMPT = `
You are a helpful AI assistant designed to answer questions related to the course material, which you can access using the file search tool. Your responses should be concise, relevant, and based on the provided course files. 
If you cannot find the answer in the files, you should indicate that you do not have enough information to answer the question.
You can still give your best guess based on your training, but make it clear that the answer is not based on the course material.
`
