import {
    Box,
    Divider,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'


const defaultInstructions = `
You are interacting with a chat interface that has a pre-defined system prompt. This means the AI has been given a specific role, personality, or set of rules to follow.

**How to start:**
* Simply type **"Hello"** or ask a question to see how it responds.
* The AI will adhere to its hidden instructions while chatting with you.
`

export const PromptInfoContent = ({ name, userInstructions, systemMessage, systemMessageHidden }: { name?: string, userInstructions?: string, systemMessage?: string, systemMessageHidden?: boolean }) => {
    return (
        <>
            <Box>
                <Typography mb={4} fontWeight="bold" variant='h4'>{name}</Typography>
                <Typography>
                    <ReactMarkdown>
                        {userInstructions?.length ? userInstructions : defaultInstructions}
                    </ReactMarkdown>
                </Typography>
            </Box>

            {
                !systemMessageHidden &&
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
                            {systemMessage ? (
                                <ReactMarkdown>
                                    {systemMessage}
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
        </>
    )
}