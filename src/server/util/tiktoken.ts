import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'

const getEncoding = () =>
  // gpt-3.5-turbo-16k not yet supported
  encoding_for_model('gpt-3.5-turbo' as TiktokenModel)

export default getEncoding
