import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'
import { ValidModelName } from '../../config'

const getEncoding = (model: ValidModelName) => {
  if (model === 'mock') {
    model = 'gpt-4o-mini'
  }

  return encoding_for_model(model as TiktokenModel)
}

export default getEncoding
