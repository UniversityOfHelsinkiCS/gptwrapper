import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'
import { ValidModelName } from '../../config'

const getEncoding = (model: ValidModelName) => {
  // 21.4.26 Tiktoken does not 'support' anything above gpt 5. So:
  // 5.1 is aliased to 4o mini encoder, as gpt 4 and 5 use the same encoder. If this becomes a pattern, this can be refactored for all openAi models.
  
  //24.4.2026, many sources state that the token counts wont differ that much, 
  //so there is no need to use a different estimator for different models.
  if (model === 'mock' || model === 'claude-haiku-4-5@20251001' || model === 'gpt-5.1' || model === 'Mistral-Large-3-1') {
    model = 'gpt-4o-mini'
  }

  return encoding_for_model(model as TiktokenModel)
}

export default getEncoding
