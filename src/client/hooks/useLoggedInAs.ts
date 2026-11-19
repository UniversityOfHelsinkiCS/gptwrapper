import { useEffect, useState } from 'react'
import safeLocalStorage from '../util/safeLocalStorage'

export const useLoggedInAs = () => {
  const [isLoggedInAs, setIsLoggedInAs] = useState(false)

  useEffect(() => {
    const loggedInAs = safeLocalStorage.getItem('adminLoggedInAs')
    if (!loggedInAs) return

    setIsLoggedInAs(true)
  }, [])

  const exitLoggedInAs = () => {
    setIsLoggedInAs(false)
    safeLocalStorage.removeItem('adminLoggedInAs')
    window.location.reload()
  }

  return {
    isLoggedInAs,
    exitLoggedInAs,
  }
}
