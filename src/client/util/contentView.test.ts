import { describe, test, expect } from 'vitest'
import { resolveContentView } from './contentView'
import type { User } from '../types'

const admin = { isAdmin: true } as unknown as User
const student = { isAdmin: false } as unknown as User

const base = {
  isLoading: false,
  isError: false,
  user: undefined,
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
  test('renders content for a logged-in user', () => {
    expect(resolveContentView({ ...base, user: student })).toBe('content')
  })
})
