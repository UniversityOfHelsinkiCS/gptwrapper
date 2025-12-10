import { ValidModelName } from "@config"
import { createContext, useContext } from "react"

export type PromptEditorFormState = {
    name: string
    userInstructions: string
    systemMessage: string
    ragSystemMessage: string
    hidden: boolean
    ragIndexId?: number | null
    selectedModel: ValidModelName | 'none'
    temperatureDefined: boolean
    temperature: number
}

export type PromptEditorFormContextValue = {
    form: PromptEditorFormState
    setForm: React.Dispatch<React.SetStateAction<PromptEditorFormState>>
    type: 'CHAT_INSTANCE' | 'PERSONAL'
    ragIndices?: { id: number; metadata: { name: string } }[]
    courseId: string
    modelHasTemperature: boolean
}

export const PromptEditorFormContext = createContext<PromptEditorFormContextValue | null>(null)

export const usePromptEditorForm = () => {
    const ctx = useContext(PromptEditorFormContext)
    if (!ctx) throw new Error('usePromptEditorForm must be used inside PromptEditorFormProvider')
    return ctx
}