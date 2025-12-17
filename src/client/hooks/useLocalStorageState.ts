import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import z from 'zod/v4'

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
    if (state !== undefined) {
      localStorage.setItem(key, JSON.stringify({ value: state }))
    } else {
      localStorage.removeItem(key)
    }
  }, [key, state])

  return [state, setState]
}

export default useLocalStorageState

export function useLocalStorageStateWithURLDefault<T>(key: string, defaultValue: string, urlKey: string, schema: z.ZodType<T>) {
  const [value, setValue] = useLocalStorageState(key, defaultValue)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlValue = searchParams.get(urlKey)

  // If urlValue is defined, it overrides the localStorage setting.
  // However if user changes the setting, the urlValue is removed.
  const modifiedSetValue = (newValue: T) => {
    if (newValue !== urlValue) {
      if (typeof newValue === 'string') {
        setValue(newValue)
      } else {
        setValue(String(newValue))
      }
      searchParams.delete(urlKey)
      setSearchParams(searchParams)
    }
  }

  const parsedValue = schema.safeParse(urlValue ?? value)

  if (parsedValue.success) {
    return [parsedValue.data, modifiedSetValue] as const
  }

  // if the value in localStorage is invalid then revert back to default
  // prevents faulty localStorage content from breaking the app
  setValue(defaultValue)
  return [defaultValue as T, modifiedSetValue] as const
}
