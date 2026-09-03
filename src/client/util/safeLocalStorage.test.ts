import { describe, test, expect, afterEach } from 'vitest'
import safeStorage from './safeStorage'

const realStorage = globalThis.localStorage
const setGlobalStorage = (value: unknown) => {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true })
}

const s = safeStorage

const brokenStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuoteExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

afterEach(() => {
  setGlobalStorage(realStorage)
})

describe('safeStorage', () => {
  test('setting, getting and removing works', () => {
    expect(s.getItem('capital')).toBe(null)
    s.setItem('capital', 'Helsinki')
    expect(s.getItem('capital')).toBe('Helsinki')
    s.removeItem('capital')
    expect(s.getItem('capital')).toBe(null)
  })

  test('throwing storage returns null', () => {
    setGlobalStorage(brokenStorage)

    expect(s.getItem('dip')).toBe(null)
    expect(s.setItem('dip', 'dap')).toBe(null)
    expect(s.removeItem('dip')).toBe(null)
  })

  test('undefined storage does not throw', () => {
    setGlobalStorage(undefined)
    expect(() => s.setItem('a', 'b')).not.toThrow()
    expect(() => s.getItem('a')).not.toThrow()
    expect(() => s.removeItem('a')).not.toThrow()
  })
})
