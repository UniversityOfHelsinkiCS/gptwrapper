/* eslint-disable no-param-reassign */
import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'

const getEncoding = (model: string) =>
  encoding_for_model(model as TiktokenModel)

export default getEncoding
