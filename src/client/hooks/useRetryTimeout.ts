import { useState, useRef, useCallback } from 'react'

const useRetryTimeout = (): [(cb: () => Promise<void> | void, time: number) => void, () => void] => {
  const [_, setDummyState] = useState(false) // Dummy state to force re-render
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setRetryTimeout = useCallback((cb: () => Promise<void> | void, time: number) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }
    const timeoutId = setTimeout(() => {
      cb()
    }, time)
    timeoutRef.current = timeoutId
    setDummyState((prev) => !prev) // Trigger a re-render
  }, [])

  const clearRetryTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      setDummyState((prev) => !prev) // Trigger a re-render
    }
  }, [])

  return [setRetryTimeout, clearRetryTimeout]
}

export default useRetryTimeout
