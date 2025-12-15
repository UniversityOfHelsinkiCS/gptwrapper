import {
    Alert,
    Box,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePromptEditorForm } from './context'
import ReactMarkdown from 'react-markdown'
import { PromptInfoContent } from './PromptInfoContent'

const defaultInstructions = `
You are interacting with a chat interface that has a pre-defined system prompt. This means the AI has been given a specific role, personality, or set of rules to follow.

**How to start:**
* Simply type **"Hello"** or ask a question to see how it responds.
* The AI will adhere to its hidden instructions while chatting with you.
`

export const PromptEditorPreview = () => {
    const { form } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Box sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
        }}>
            <Alert severity='info'>Tämä näkymä näkyy opiskelijoille kohdassa "Alustuksen tiedot".</Alert>
            <PromptInfoContent
                name={form.name}
                userInstructions={form.userInstructions}
                systemMessage={form.systemMessage}
                systemMessageHidden={form.hidden}
            />
        </Box>)
}

