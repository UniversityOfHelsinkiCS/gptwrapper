import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import z from 'zod/v4'
import safeLocalStorage from '../util/safeLocalStorage'

function useLocalStorageState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]
function useLocalStorageState<T>(key: string): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
function useLocalStorageState<T>(key: string, defaultValue = undefined) {
  const [state, setState] = useState(() => {
    const storedValue = safeLocalStorage.getItem(key)
    if (!storedValue) return defaultValue

    let parsedValue: T | undefined
    try {
      const parsedObject = JSON.parse(storedValue) as { value: T }

      if (!('value' in parsedObject)) throw new Error('Invalid Local Storage State JSON format')

      parsedValue = parsedObject.value
    } catch (error) {
      console.error(`Failed to parse value for key "${key}":`, error)
      parsedValue = defaultValue
    }
    return parsedValue
  })

  useEffect(() => {
    if (state !== undefined) {
      safeLocalStorage.setItem(key, JSON.stringify({ value: state }))
    } else {
      safeLocalStorage.removeItem(key)
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

  useEffect(() => {
    if (!parsedValue.success) {
      setValue(defaultValue)
    }
  }, [parsedValue.success, defaultValue, setValue])

  if (parsedValue.success) {
    return [parsedValue.data, modifiedSetValue] as const
  }
  return [defaultValue as T, modifiedSetValue] as const
}
