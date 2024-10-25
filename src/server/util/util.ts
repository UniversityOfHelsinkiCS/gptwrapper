import { CustomMessage } from '../types'
import { DEFAULT_MODEL, DEFAUL_CONTEXT_LIMIT, validModels } from '../../config'
import { ChatInstance } from '../db/models'

/**
 * Filter out messages in a long conversation to save costs
 * and to stay within context limit.
 * Always keep system messages and last 10 messages
 */
export const getMessageContext = (
  messages: CustomMessage[]
): CustomMessage[] => {
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
  const allModels = validModels.map(({ name }) => name)

  if (model === 'gpt-4') return allModels

  if (model === 'gpt-4o') return ['gpt-4o', 'gpt-4o-mini']

  return ['gpt-4o-mini']
}

export const getModelContextLimit = (modelName: string) => {
  const model = validModels.find(({ name }) => name === modelName)

  if (!model) return DEFAUL_CONTEXT_LIMIT

  return model.context
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const generateTerms = () => {
  const dateNow = new Date()
  const yearNow = dateNow.getFullYear()
  const monthNow = dateNow.getMonth()

  const terms = []
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
