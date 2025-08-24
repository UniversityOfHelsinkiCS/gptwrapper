import { createContext, useContext } from 'react'
import { useSearchParams } from 'react-router-dom'

const EmbeddedContext = createContext(false)

export const EmbeddedProvider = ({ children }) => {
  const [searchParams] = useSearchParams()
  const embedded = searchParams.get('embedded')

  return <EmbeddedContext.Provider value={embedded === 'true'}>{children}</EmbeddedContext.Provider>
}

export const useIsEmbedded = () => useContext(EmbeddedContext)
