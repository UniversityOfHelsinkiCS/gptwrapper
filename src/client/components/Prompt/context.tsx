import { createContext, useContext } from "react"
import { PromptEditorFormContextValue } from "src/client/types"

export const PromptEditorFormContext = createContext<PromptEditorFormContextValue | null>(null)

export const usePromptEditorForm = () => {
    const ctx = useContext(PromptEditorFormContext)
    if (!ctx) throw new Error('usePromptEditorForm must be used inside PromptEditorFormProvider')
    return ctx
}