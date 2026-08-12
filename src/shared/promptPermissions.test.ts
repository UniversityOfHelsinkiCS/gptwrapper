import { describe, expect, test } from 'vitest'

import { canCopyPrompt } from './promptPermissions'

describe('canCopyPrompt', () => {
  test('lets a responsible teacher copy a course prompt they did not write', () => {
    expect(canCopyPrompt({ isAdmin: false, isOwner: false, isResponsible: true })).toBe(true)
  })

  test('lets anyone duplicate their own prompt', () => {
    expect(canCopyPrompt({ isAdmin: false, isOwner: true, isResponsible: false })).toBe(true)
  })

  test('lets admins copy anything', () => {
    expect(canCopyPrompt({ isAdmin: true, isOwner: false, isResponsible: false })).toBe(true)
  })

  test('stops a student copying a course prompt', () => {
    expect(canCopyPrompt({ isAdmin: false, isOwner: false, isResponsible: false })).toBe(false)
  })

  test('lets a student copy a university template they neither own nor are responsible for', () => {
    expect(canCopyPrompt({ isAdmin: false, isOwner: false, isResponsible: false, isUniversityTemplate: true })).toBe(true)
  })

  test('treats a missing isUniversityTemplate as not a template', () => {
    expect(canCopyPrompt({ isAdmin: false, isOwner: false, isResponsible: false, isUniversityTemplate: false })).toBe(false)
  })
})
