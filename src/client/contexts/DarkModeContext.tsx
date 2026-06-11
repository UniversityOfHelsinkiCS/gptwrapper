import { createContext, useContext } from 'react'
import useLocalStorageState from '../hooks/useLocalStorageState'

const DarkModeContext = createContext<{
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
}>({
  darkMode: false,
  setDarkMode: () => {},
})

export const DarkModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useLocalStorageState('dark-mode', false)

  return <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>{children}</DarkModeContext.Provider>
}

export const useDarkMode = () => useContext(DarkModeContext)
