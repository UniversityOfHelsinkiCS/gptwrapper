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

            <Box>
                <Typography mb={4} fontWeight="bold" variant='h4'>{form.name}</Typography>
                <Typography>
                    <ReactMarkdown>
                        {defaultInstructions}
                    </ReactMarkdown>
                </Typography>
            </Box>

            {
                !form.hidden &&
                <>
                    <Divider />
                    <Box>
                        <Typography mb={2} fontWeight="bold" variant='h5'>Kielimallin ohjeistus</Typography>
                        <Box
                            sx={{
                                // Mimic MUI TextField Outline styles
                                border: '1px solid',
                                borderColor: 'rgba(0, 0, 0, 0.23)', // Standard MUI input border color
                                borderRadius: 1, // Standard MUI radius (4px)
                                p: '0.5rem 1rem', // Standard MUI input padding
                                minHeight: '190px', // approx minRows={8}
                                opacity: 0.8,
                            }}
                        >
                            {form.systemMessage ? (
                                <ReactMarkdown>
                                    {form.systemMessage}
                                </ReactMarkdown>
                            ) : (
                                <Typography color="text.secondary">
                                    Ei kielimallin ohjeita
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </>
            }

        </Box>)
}

