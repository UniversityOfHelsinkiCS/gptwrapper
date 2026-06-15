import { createContext, useContext } from "react"
import { PromptEditorFormContextValue, PromptEditorContextValue } from "src/client/types"

export const PromptEditorFormContext = createContext<PromptEditorFormContextValue | null>(null)

export const usePromptEditorForm = () => {
    const ctx = useContext(PromptEditorFormContext)
    if (!ctx) throw new Error('usePromptEditorForm must be used inside PromptEditorFormProvider')
    return ctx
}

export const PromptEditorState =
  createContext<PromptEditorContextValue | null>(null)

export const usePromptEditorState = () => {
  const ctx = useContext(PromptEditorState)

  if (!ctx) {
    throw new Error('usePromptEditorState must be used inside PromptEditorStateProvider')
  }

  return ctx
}