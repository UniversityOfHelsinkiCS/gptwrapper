import { encoding_for_model, Tiktoken, TiktokenModel } from '@dqbd/tiktoken'
import { ValidModelName } from '../../config'

// 21.4.26 Tiktoken does not 'support' anything above gpt 5. So:
// 5.1 is aliased to 4o mini encoder, as gpt 4 and 5 use the same encoder. If this becomes a pattern, this can be refactored for all openAi models.

//24.4.2026, many sources state that the token counts wont differ that much,
//so there is no need to use a different estimator for different models.
const TIKTOKEN_MODEL: TiktokenModel = 'gpt-4o-mini'

let cachedEncoding: Tiktoken | null = null

const getEncoding = (_model: ValidModelName) => {
  if (!cachedEncoding) {
    cachedEncoding = encoding_for_model(TIKTOKEN_MODEL)
  }
  return cachedEncoding
}

export default getEncoding
