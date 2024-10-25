import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'

const getEncoding = (model: string) => {
  if (model === 'mock') {
    model = 'gpt-4o-mini'
  }

  return encoding_for_model(model as TiktokenModel)
}

export default getEncoding
