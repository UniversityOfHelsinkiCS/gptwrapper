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

      console.log(`localStorage value for "${key}":`, parsedObject.value)

      if (!('value' in parsedObject)) throw new Error('Invalid localStorageState JSON format')

      parsedValue = parsedObject.value
    } catch (error) {
      console.error(`Failed to parse value for key "${key}":`, error)
      parsedValue = defaultValue
    }
    return parsedValue
  })

  useEffect(() => {
    if (state !== undefined) {
      console.log(`Setting localStorage value for "${key}"`, state)
      localStorage.setItem(key, JSON.stringify({ value: state }))
    } else {
      console.log(`Removing localStorage value for "${key}"`)
      localStorage.removeItem(key)
    }
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
