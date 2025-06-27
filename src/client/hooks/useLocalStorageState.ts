import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

function useLocalStorageState<T extends object>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]
function useLocalStorageState<T extends object>(key: string): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
function useLocalStorageState<T extends object>(key: string, defaultValue = undefined) {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key)
    if (!storedValue) return defaultValue

    let parsedValue: T | undefined
    try {
      parsedValue = JSON.parse(storedValue) as T
    } catch (error) {
      console.error(`Failed to parse value for key "${key}":`, error)
      parsedValue = defaultValue
    }
    return parsedValue
  })

  useEffect(() => {
    if (state) localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
