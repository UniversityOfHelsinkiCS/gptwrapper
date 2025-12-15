import {
    Alert,
    Box,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePromptEditorForm } from './context'
import { PromptInfoContent } from './PromptInfoContent'

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
            <Alert severity='info'>{t('prompt:studentViewInfoAlert')}</Alert>
            <PromptInfoContent
                name={form.name}
                userInstructions={form.userInstructions}
                systemMessage={form.systemMessage}
                systemMessageHidden={form.hidden}
            />
        </Box>)
}