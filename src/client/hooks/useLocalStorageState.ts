import { Dispatch, SetStateAction, useEffect, useState } from 'react'

function useLocalStorageState<T extends object>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]
function useLocalStorageState<T extends object>(key: string): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
function useLocalStorageState<T extends object>(key: string, defaultValue = undefined) {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key)
    return storedValue !== null ? (JSON.parse(storedValue) as T) : defaultValue
  })

  useEffect(() => {
    if (state !== null) localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
