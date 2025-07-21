import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

function useLocalStorageState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]
function useLocalStorageState<T>(key: string): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
function useLocalStorageState<T>(key: string, defaultValue = undefined) {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key)
    if (!storedValue) return defaultValue

    let parsedValue: T | undefined
    try {
      const parsedObject = JSON.parse(storedValue) as { value: T }

      if (!('value' in parsedObject)) throw new Error('Invalid localStorageState JSON format')

      parsedValue = parsedObject.value
    } catch (error) {
      console.error(`Failed to parse value for key "${key}":`, error)
      parsedValue = defaultValue
    }
    return parsedValue
  })

  useEffect(() => {
    if (state) localStorage.setItem(key, JSON.stringify({ value: state }))
    if (state === undefined) localStorage.removeItem(key)
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
