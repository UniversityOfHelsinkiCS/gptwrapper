import type { FeatureEvent } from '../../shared/featureEvents'
import logger from '../util/logger'

/** Writes one `FeatureEvent` log line (see `FeatureEventSchema`). Never add the user or the course here. */
export const recordFeatureEvent = (event: FeatureEvent) => {
  logger.info('FeatureEvent', event)
}
