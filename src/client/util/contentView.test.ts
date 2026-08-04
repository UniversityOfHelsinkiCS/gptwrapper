import { describe, test, expect } from 'vitest'
import { resolveContentView } from './contentView'
import type { User } from '../types'

const admin = { isAdmin: true, acviteCouseIds: [] } as unknown as User
const student = { isAdmin: false, activeCourseIds: ['course-1'] } as unknown as User

const base = {
  isLoading: false,
  isError: false,
  user: undefined,
  courseId: undefined,
  onNoAccessPage: false,
}

describe('resolveContentView', () => {
  test('shows the error view when login fails and no user is cached', () => {
    expect(resolveContentView({ ...base, isError: true })).toBe('error')
  })

  test('does not redirect to /noaccess when the login request fails', () => {
    expect(resolveContentView({ ...base, isError: true })).not.toBe('redirect')
  })

  test('keeps rendering when a background refetch fails but a user is cached', () => {
    expect(resolveContentView({ ...base, isError: true, user: admin })).toBe('content')
  })

  test('redirects when there is genuinely no user', () => {
    expect(resolveContentView({ ...base, user: null })).toBe('redirect')
  })

  test('shows the spinner while loading', () => {
    expect(resolveContentView({ ...base, isLoading: true })).toBe('loading')
  })

  test('renders the noaccess page without looping', () => {
    expect(resolveContentView({ ...base, user: null, onNoAccessPage: true })).toBe('content')
  })

  test('redirects a student away from a course they are not enrolled on', () => {
    expect(resolveContentView({ ...base, user: student, courseId: 'other-course' })).toBe('redirect')
  })

  test('lets a student into a course they are enrolled on', () => {
    expect(resolveContentView({ ...base, user: student, courseId: 'course-1' })).toBe('content')
  })
})
