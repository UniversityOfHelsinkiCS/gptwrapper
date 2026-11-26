import { describe, expect, it } from 'vitest'
import { FeatureEventSchema } from './featureEvents'

describe('FeatureEventSchema', () => {
  it('accepts every event from the event table', () => {
    const events = [
      { feature: 'chat', action: 'send' },
      { feature: 'quote', action: 'explain' },
      { feature: 'quote', action: 'summarize' },
      { feature: 'quote', action: 'translate' },
      { feature: 'quote', action: 'ask_sent' },
      { feature: 'viewer', action: 'open', fileType: 'pdf', source: 'my_files' },
      { feature: 'viewer', action: 'open', fileType: 'md', source: 'agent_link' },
      { feature: 'my_files', action: 'upload', fileCount: 3, fileType: 'pdf' },
      { feature: 'my_files', action: 'upload', fileCount: 2, fileType: 'mixed' },
      { feature: 'my_files', action: 'attach_folder' },
    ]
    for (const event of events) {
      expect(FeatureEventSchema.safeParse(event).success, JSON.stringify(event)).toBe(true)
    }
  })

  it('rejects unknown features and actions', () => {
    expect(FeatureEventSchema.safeParse({ feature: 'rag', action: 'send' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'chat', action: 'delete' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'my_files', action: 'delete' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'chat' }).success).toBe(false)
  })

  it('rejects extras on the wrong feature or action', () => {
    expect(FeatureEventSchema.safeParse({ feature: 'chat', action: 'send', fileType: 'pdf' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'quote', action: 'explain', source: 'quote' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'my_files', action: 'attach_folder', fileCount: 1 }).success).toBe(false)
  })

  it('rejects unknown fields such as a user or a path', () => {
    expect(FeatureEventSchema.safeParse({ feature: 'chat', action: 'send', userId: 'u1' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'viewer', action: 'open', fileType: 'pdf', source: 'quote', path: '/a.pdf' }).success).toBe(false)
  })

  it('rejects invalid extras', () => {
    expect(FeatureEventSchema.safeParse({ feature: 'viewer', action: 'open', fileType: 'docx', source: 'quote' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'viewer', action: 'open', fileType: 'pdf', source: 'menu' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'viewer', action: 'open', fileType: 'pdf' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'my_files', action: 'upload', fileCount: 0, fileType: 'pdf' }).success).toBe(false)
    expect(FeatureEventSchema.safeParse({ feature: 'my_files', action: 'upload', fileCount: 1, fileType: 'notes/a.pdf' }).success).toBe(false)
  })
})
