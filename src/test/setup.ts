import { Storage } from 'happy-dom'
import { beforeEach } from 'vitest'

Object.defineProperty(globalThis, 'localStorage', { value: new Storage(), configurable: true, writable: true })

beforeEach(() => {
  localStorage.clear()
})
