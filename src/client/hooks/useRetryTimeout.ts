import { useState } from 'react'

const useRetryTimeout = (): [
  (cb: () => Promise<void> | void, time: number) => void,
  () => void,
] => {
  const [retryTimeout, setRetryTimeout] = useState(null)

  return [
    (cb: () => Promise<void> | void, time: number) => {
      clearTimeout(retryTimeout)
      setRetryTimeout(setTimeout(cb, time))
    },
    () => {
      clearTimeout(retryTimeout)
      setRetryTimeout(null)
    },
  ]
}

export default useRetryTimeout
