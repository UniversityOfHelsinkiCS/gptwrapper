import React, { createContext, useContext, ReactNode } from 'react'

interface PromptContextType {
  promptId: string
  ragIndexId: number
}

const PromptContext = createContext<PromptContextType | undefined>(undefined)

interface PromptProviderProps {
  children: ReactNode
  promptId: string
  ragIndexId: number
}

export const PromptProvider: React.FC<PromptProviderProps> = ({ children, promptId, ragIndexId }) => {
  const value = {
    promptId,
    ragIndexId,
  }

  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>
}

export const usePromptContext = (): PromptContextType => {
  const context = useContext(PromptContext)
  if (context === undefined) {
    throw new Error('usePromptContext must be used within a PromptProvider')
  }
  return context
}
