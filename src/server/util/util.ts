import crypto from 'crypto'

import { CustomMessage } from '../types'
import { DEFAULT_MODEL, DEFAUL_CONTEXT_LIMIT, validModels } from '../../config'
import { ChatInstance } from '../db/models'

/**
 * Filter out messages in a long conversation to save costs
 * and to stay within context limit.
 * Always keep system messages and last 10 messages
 */
export const getMessageContext = (messages: CustomMessage[]): CustomMessage[] => {
  const systemMessages = messages.filter((message) => message.role === 'system')
  const otherMessages = messages.filter((message) => message.role !== 'system')

  const latestMessages = otherMessages.slice(-10)

  return systemMessages.concat(latestMessages)
}

export const getCourseModel = async (courseId: string): Promise<string> => {
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['model'],
  })

  return chatInstance?.model || DEFAULT_MODEL
}

export const getAllowedModels = (model: string): string[] => {
  // Some kludge implementation
  // Do better model management https://github.com/UniversityOfHelsinkiCS/gptwrapper/issues/267
  const allModels = validModels.map(({ name }) => name)

  if (model === 'gpt-4') return allModels

  if (model === 'gpt-4o') return ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini']

  if (model === 'gpt-4.1') return ['gpt-4.1', 'gpt-4o-mini']

  return ['gpt-4o-mini']
}

export const getModelContextLimit = (modelName: string) => {
  const model = validModels.find(({ name }) => name === modelName)

  if (!model) return DEFAUL_CONTEXT_LIMIT

  return model.context
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const generateTerms = () => {
  const dateNow = new Date()
  const yearNow = dateNow.getFullYear()
  const monthNow = dateNow.getMonth()

  type Term = {
    label: {
      en: string
      fi: string
      sv: string
    }
    id: number
    startDate: string
    endDate: string
  }
  const terms: Term[] = []
  let id = 1

  // this is ugly
  for (let y = 2023; y <= yearNow + (monthNow > 7 ? 1 : 0); y += 1) {
    terms.push({
      label: {
        en: `spring ${y}`,
        fi: `kevät ${y}`,
        sv: `vår ${y}`,
      },
      id,
      startDate: `${y}-01-01`,
      endDate: `${y}-07-31`,
    })

    terms.push({
      label: {
        en: `fall ${y}`,
        fi: `syksy ${y}`,
        sv: `höst ${y}`,
      },
      id: id + 1,
      startDate: `${y}-08-01`,
      endDate: `${y}-12-31`,
    })

    id += 2
  }

  return terms.splice(0, terms.length - 1).reverse()
}

const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'default'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default'

const algorithm = 'aes-256-cbc'
const key = new Uint8Array(Buffer.from(ENCRYPTION_KEY, 'hex'))
const iv = new Uint8Array(Buffer.from(ENCRYPTION_IV, 'hex'))

export function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return { encryptedData: encrypted.toString('hex') }
}

export function decrypt(encryptedData) {
  const text = {
    iv: ENCRYPTION_IV,
    encryptedData,
  }

  const encryptedText = Buffer.from(text.encryptedData, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  const decrypted = decipher.update(new Uint8Array(encryptedText))
  return Buffer.concat([decrypted, decipher.final()]).toString()
}
