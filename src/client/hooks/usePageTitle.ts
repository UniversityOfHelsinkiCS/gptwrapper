import { useEffect } from 'react'

const APP_NAME = 'CurreChat'

export const usePageTitle = (...parts: (string | null | undefined)[]) => {
  const title = [...parts.filter(Boolean), APP_NAME].join(' – ')

  useEffect(() => {
    document.title = title
    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
