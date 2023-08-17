/* eslint-disable no-param-reassign */
import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'

const getEncoding = (model: string) => {
  // gpt-3.5-turbo-16k not yet supported
  if (model === 'gpt-3.5-turbo-16k') model = 'gpt-3.5-turbo'

  return encoding_for_model(model as TiktokenModel)
}

export default getEncoding
