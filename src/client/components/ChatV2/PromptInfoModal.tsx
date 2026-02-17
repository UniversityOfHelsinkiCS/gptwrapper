import { Box, CircularProgress } from '@mui/material'
import { useParams } from 'react-router-dom'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptInfoContent } from '../Prompt/PromptInfoContent'
import useCurrentUser from '../../hooks/useCurrentUser'
import useCourse from '../../hooks/useCourse'

export const PromptInfoModal = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
    const { activePrompt: prompt } = usePromptState()
    const { courseId } = useParams()
    const { user } = useCurrentUser()
    const { data: course } = useCourse(courseId)

    const isTeacher = user?.isAdmin || course?.responsibilities?.some((r) => r.user.id === user?.id) || false

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
            isTeacher={isTeacher}
        />
    )
}