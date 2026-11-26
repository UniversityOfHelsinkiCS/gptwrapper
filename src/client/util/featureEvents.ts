import type { FeatureEvent } from '@shared/featureEvents'
import { PUBLIC_URL } from '../../config'
import { getFetchHeaders } from './apiClient'

/**
 * Sends a feature usage ping (see `FeatureEvent`) to the server, fire and forget: it never throws, is not awaited and
 * shows nothing when it fails.
 */
export const trackFeatureEvent = (event: FeatureEvent): void => {
  try {
    fetch(`${PUBLIC_URL}/api/analytics/events`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...getFetchHeaders() },
      body: JSON.stringify(event),
    }).catch(() => {})
  } catch {
    // Analytics must never break the feature.
  }
}
