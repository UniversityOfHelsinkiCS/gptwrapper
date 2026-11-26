import type { UserMessage } from '@shared/chat'
import type { FeatureEvent } from '@shared/featureEvents'

/**
 * The feature events of a sent chat message (see `FeatureEventSchema`): always `chat` / `send`, plus its `quote` event
 * when it has quotes, the quick action or `ask_sent` when it has none.
 */
export const featureEventsForMessage = (message: Pick<UserMessage, 'quotes' | 'quickAction'>): FeatureEvent[] => {
  const events: FeatureEvent[] = [{ feature: 'chat', action: 'send' }]
  if (message.quotes && message.quotes.length > 0) events.push({ feature: 'quote', action: message.quickAction ?? 'ask_sent' })
  return events
}
