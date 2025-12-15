import { Box, CircularProgress } from '@mui/material'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptInfoContent } from '../Prompt/PromptInfoContent'

export const PromptInfoModal = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
    const { activePrompt: prompt } = usePromptState()

    if (!prompt) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px', // Ensures the modal doesn't collapse
                width: '100%'
            }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <PromptInfoContent
            name={prompt.name}
            userInstructions={prompt.userInstructions ?? ''}
            systemMessage={prompt.systemMessage}
            hidden={prompt.hidden}
            type={prompt.type}
        />
    )
}