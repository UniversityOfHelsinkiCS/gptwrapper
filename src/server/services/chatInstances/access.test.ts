// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'

vi.mock('../../db/models', () => ({
  Enrolment: {},
  Prompt: {},
  RagIndex: {},
  Responsibility: {},
  User: {},
}))

import { toAccessLevel } from './access'

const none = { isAdmin: false, isResponsible: false, isEnrolled: false, isActive: true }

describe('toAccessLevel', () => {
  test('admin gets FULL without any membership', () => {
    expect(toAccessLevel({ ...none, isAdmin: true })).toBe('FULL')
  })

  test('responsible gets FULL even on a closed course', () => {
    expect(toAccessLevel({ ...none, isResponsible: true, isActive: false })).toBe('FULL')
  })

  test('enrolled student on an active course gets STUDENT', () => {
    expect(toAccessLevel({ ...none, isEnrolled: true })).toBe('STUDENT')
  })

  test('enrolled student on a closed course gets STUDENT_CLOSED', () => {
    expect(toAccessLevel({ ...none, isEnrolled: true, isActive: false })).toBe('STUDENT_CLOSED')
  })

  test('no membership gets no access', () => {
    expect(toAccessLevel(none)).toBeNull()
  })
})
