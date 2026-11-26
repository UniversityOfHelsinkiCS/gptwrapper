// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import logger from '../util/logger'
import { recordFeatureEvent } from './featureEvents'

describe('recordFeatureEvent', () => {
  test('logs exactly the FeatureEvent message and the event', () => {
    const event = { feature: 'viewer', action: 'open', fileType: 'pdf', source: 'quote' } as const
    recordFeatureEvent(event)
    expect(vi.mocked(logger.info).mock.calls).toEqual([['FeatureEvent', event]])
  })
})
