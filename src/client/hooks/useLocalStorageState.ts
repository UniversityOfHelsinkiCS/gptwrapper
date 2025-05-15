import { useState, useEffect, SetStateAction, Dispatch } from 'react'

function useLocalStorageState<T extends object>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const storedValue = localStorage.getItem(key)
    return storedValue !== null ? JSON.parse(storedValue) : defaultValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState
